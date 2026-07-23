import { matchTaxonomy, splitVariants } from './class-parser'
import type { CssScanResult } from '../types'

/**
 * Sélecteur de classe CSS, en gérant les caractères échappés (`\:`, `\/`, `\[`, `\]`, `\.`...)
 * que Tailwind génère pour les variants/valeurs arbitraires dans le sélecteur compilé
 * (ex. `.hover\:bg-red-500:hover`, `.w-\[100px\]`). Un caractère normal OU un backslash
 * suivi de n'importe quel caractère sont acceptés ; on s'arrête au premier caractère
 * "non échappé" qui ne fait pas partie d'un nom de classe (`:`, ` `, `.`, `>`, `[`...).
 */
const CLASS_SELECTOR_RE = /\.((?:[A-Za-z0-9_-]|\\.)+)/g

function unescapeCssIdent(raw: string): string {
  return raw.replace(/\\(.)/g, '$1')
}

function isRecognizedTailwindClass(className: string): boolean {
  const { base } = splitVariants(className)
  return matchTaxonomy(base) !== null
}

function extractClassSelectors(selectorText: string): string[] {
  const out: string[] = []
  for (const m of selectorText.matchAll(CLASS_SELECTOR_RE)) {
    out.push(unescapeCssIdent(m[1]))
  }
  return out
}

function isRuleWithSelector(rule: CSSRule): rule is CSSStyleRule {
  return 'selectorText' in rule
}

function isGroupingRule(rule: CSSRule): rule is CSSMediaRule | CSSSupportsRule {
  return 'cssRules' in rule
}

/**
 * `isRuleWithSelector` et `isGroupingRule` ne sont PAS mutuellement exclusifs : depuis le
 * support natif du CSS Nesting, un `CSSStyleRule` a lui aussi une propriété `cssRules`
 * (liste vide si aucune règle imbriquée), en plus de son propre `selectorText`. Il faut donc
 * traiter le sélecteur de la règle ET recurser dans ses éventuelles règles imbriquées.
 */
function walkRules(rules: CSSRuleList, href: string | null, found: Map<string, string[]>) {
  for (const rule of Array.from(rules)) {
    if (isRuleWithSelector(rule)) {
      for (const cls of extractClassSelectors(rule.selectorText)) {
        if (isRecognizedTailwindClass(cls)) continue
        const sources = found.get(cls) ?? []
        if (!sources.includes(href ?? '(inline)')) sources.push(href ?? '(inline)')
        found.set(cls, sources)
      }
    }
    if (isGroupingRule(rule) && rule.cssRules.length > 0) {
      walkRules(rule.cssRules, href, found)
    }
  }
}

/**
 * Récupère le contenu d'une feuille cross-origin via `fetch()` (soumis à CORS, contrairement
 * à `sheet.cssRules` qui est bloqué inconditionnellement par le CSSOM pour toute feuille
 * cross-origin, CORS ou pas) et la parse en l'insérant dans une `CSSStyleSheet` détachée —
 * une fois le texte récupéré, ce n'est plus une ressource distante du point de vue du CSSOM,
 * `cssRules` s'y lit normalement. Marche pour les CDN publics qui autorisent CORS (Google
 * Fonts, jsDelivr, unpkg...) ; échoue silencieusement sinon (pas de CORS, réseau, `@import`
 * dans le texte que `CSSStyleSheet` constructible n'accepte pas).
 */
async function fetchCrossOriginRules(href: string): Promise<CSSRuleList | null> {
  try {
    const res = await fetch(href, { mode: 'cors' })
    if (!res.ok) return null
    const text = await res.text()
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(text)
    return sheet.cssRules
  } catch {
    return null
  }
}

/**
 * Parcourt les feuilles de style chargées par la page pour en extraire les classes
 * "custom" (non reconnues comme Tailwind). Les feuilles cross-origin sans CORS restent
 * listées comme non scannables (`fetch()` échoue aussi dans ce cas) ; celles qui autorisent
 * CORS sont récupérées via `fetchCrossOriginRules`.
 */
export async function scanCustomClasses(doc: Document = document): Promise<CssScanResult> {
  const found = new Map<string, string[]>()
  const unscannable: string[] = []
  const corsRetry: string[] = []

  for (const sheet of Array.from(doc.styleSheets)) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      if (sheet.href) corsRetry.push(sheet.href)
      else unscannable.push('(inline)')
      continue
    }
    if (rules) walkRules(rules, sheet.href, found)
  }

  await Promise.all(
    corsRetry.map(async (href) => {
      const rules = await fetchCrossOriginRules(href)
      if (rules) walkRules(rules, href, found)
      else unscannable.push(href)
    }),
  )

  return { found, unscannable }
}

function ruleListHasClass(rules: CSSRuleList, target: string): boolean {
  for (const rule of Array.from(rules)) {
    if (isRuleWithSelector(rule) && extractClassSelectors(rule.selectorText).includes(target)) return true
    if (isGroupingRule(rule) && rule.cssRules.length > 0 && ruleListHasClass(rule.cssRules, target)) return true
  }
  return false
}

/**
 * Est-ce qu'une règle CSS existe déjà pour cette classe exacte sur la page (hors feuille
 * injectée par DevWind lui-même, cf. src/core/live-style.ts) ? Sert à savoir si on doit
 * synthétiser nous-mêmes la règle pour prévisualiser une classe absente d'un build de
 * production purgé (voir live-style.ts).
 */
export function hasRuleForClass(className: string, doc: Document = document, ignoreStyleId?: string): boolean {
  for (const sheet of Array.from(doc.styleSheets)) {
    const owner = sheet.ownerNode as HTMLElement | null
    if (ignoreStyleId && owner?.id === ignoreStyleId) continue
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    if (rules && ruleListHasClass(rules, className)) return true
  }
  return false
}

const STYLESHEET_SELECTOR = 'link[rel="stylesheet"], style'

function isStylesheetNode(node: Node): boolean {
  return node instanceof Element && node.matches(STYLESHEET_SELECTOR)
}

/**
 * Prévient `onChange` (avec un debounce, pour absorber les ajouts en rafale d'un même
 * rendu) quand la page ajoute une nouvelle feuille de style (`<link rel="stylesheet">` ou
 * `<style>`) après le scan initial — cas des sites qui chargent du CSS à la demande (route
 * SPA, composant lazy-loadé...). Retourne une fonction de nettoyage.
 */
export function watchForStylesheetChanges(onChange: () => void, doc: Document = document): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const observer = new MutationObserver((mutations) => {
    const hasNewStylesheet = mutations.some((m) => Array.from(m.addedNodes).some(isStylesheetNode))
    if (!hasNewStylesheet) return
    if (debounceTimer != null) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(onChange, 300)
  })

  observer.observe(doc.documentElement, { childList: true, subtree: true })

  return () => {
    if (debounceTimer != null) clearTimeout(debounceTimer)
    observer.disconnect()
  }
}
