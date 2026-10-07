import { extractClassSelectors, isGroupingRule, isRuleWithSelector } from './css-selectors'
import { collectBreakpointVotes } from './breakpoint-scanner'
import type { BreakpointVote, CssScanResult } from '../types'

/**
 * Appelle `onClass` pour chaque classe d'un sélecteur. `isRuleWithSelector` et
 * `isGroupingRule` ne sont PAS mutuellement exclusifs : depuis le support natif du CSS Nesting,
 * un `CSSStyleRule` a lui aussi une propriété `cssRules` (liste vide si aucune règle imbriquée),
 * en plus de son propre `selectorText`. Il faut donc traiter le sélecteur de la règle ET
 * recurser dans ses éventuelles règles imbriquées.
 */
function walkRules(rules: CSSRuleList, onClass: (cls: string) => void) {
  for (const rule of Array.from(rules)) {
    if (isRuleWithSelector(rule)) {
      for (const cls of extractClassSelectors(rule.selectorText)) onClass(cls)
    }
    if (isGroupingRule(rule) && rule.cssRules.length > 0) walkRules(rule.cssRules, onClass)
  }
}

function addSource(found: Map<string, string[]>, href: string | null) {
  const source = href ?? '(inline)'
  return (cls: string) => {
    const sources = found.get(cls)
    if (!sources) found.set(cls, [source])
    else if (!sources.includes(source)) sources.push(source)
  }
}

function isIgnoredSheet(sheet: CSSStyleSheet, ignoreStyleId?: string): boolean {
  return ignoreStyleId != null && (sheet.ownerNode as Element | null)?.id === ignoreStyleId
}

const CROSS_ORIGIN_TIMEOUT_MS = 5000
// Large devant une feuille Tailwind de prod (quelques centaines de Ko) ou un framework complet.
const CROSS_ORIGIN_MAX_BYTES = 5 * 1024 * 1024

/** Lit le corps en flux et abandonne dès que `maxBytes` est dépassé (`Content-Length` peut être
 * absent ou faux, on ne s'y fie que pour refuser d'emblée). `null` si trop gros. */
async function readTextWithLimit(res: Response, maxBytes: number): Promise<string | null> {
  if (Number(res.headers.get('content-length')) > maxBytes || !res.body) return null
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let total = 0
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return text + decoder.decode()
    total += value.byteLength
    if (total > maxBytes) {
      void reader.cancel()
      return null
    }
    text += decoder.decode(value, { stream: true })
  }
}

/**
 * Récupère le contenu d'une feuille cross-origin via `fetch()` (soumis à CORS, contrairement
 * à `sheet.cssRules` qui est bloqué inconditionnellement par le CSSOM pour toute feuille
 * cross-origin, CORS ou pas) et la parse en l'insérant dans une `CSSStyleSheet` détachée —
 * une fois le texte récupéré, ce n'est plus une ressource distante du point de vue du CSSOM,
 * `cssRules` s'y lit normalement. Marche pour les CDN publics qui autorisent CORS (Google
 * Fonts, jsDelivr, unpkg...) ; échoue silencieusement sinon (pas de CORS, réseau, `@import`
 * dans le texte que `CSSStyleSheet` constructible n'accepte pas). Borné en temps et en taille
 * (serveur lent ou réponse énorme ne doivent pas bloquer le scan), et sans cookies : on ne
 * fait que lire une feuille publique.
 */
async function fetchCrossOriginRules(href: string): Promise<CSSRuleList | null> {
  try {
    const res = await fetch(href, { mode: 'cors', credentials: 'omit', signal: AbortSignal.timeout(CROSS_ORIGIN_TIMEOUT_MS) })
    if (!res.ok) return null
    const text = await readTextWithLimit(res, CROSS_ORIGIN_MAX_BYTES)
    if (text == null) return null
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(text)
    return sheet.cssRules
  } catch {
    return null
  }
}

/**
 * Parcourt les feuilles de style chargées par la page et liste TOUTES les classes de leurs
 * sélecteurs, avec leurs sources : c'est le panneau, qui a la taxonomie, qui écarte ensuite
 * les classes Tailwind pour ne garder que les "custom". Les feuilles cross-origin sans CORS
 * restent listées comme non scannables (`fetch()` échoue aussi dans ce cas) ; celles qui
 * autorisent CORS sont récupérées via `fetchCrossOriginRules`. Recense au passage les
 * breakpoints utilisés par les media queries du site (cf. breakpoint-scanner.ts).
 */
export async function scanStylesheetClasses(
  doc: Document = document,
  ignoreStyleId?: string,
): Promise<CssScanResult & { breakpoints: BreakpointVote[] }> {
  const found = new Map<string, string[]>()
  const unscannable: string[] = []
  const corsRetry: string[] = []
  const votes = new Map<string, BreakpointVote>()

  for (const sheet of Array.from(doc.styleSheets)) {
    if (isIgnoredSheet(sheet, ignoreStyleId)) continue
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      if (sheet.href) corsRetry.push(sheet.href)
      else unscannable.push('(inline)')
      continue
    }
    if (!rules) continue
    walkRules(rules, addSource(found, sheet.href))
    collectBreakpointVotes(rules, votes)
  }

  await Promise.all(
    corsRetry.map(async (href) => {
      const rules = await fetchCrossOriginRules(href)
      if (!rules) {
        unscannable.push(href)
        return
      }
      walkRules(rules, addSource(found, href))
      collectBreakpointVotes(rules, votes)
    }),
  )

  return { found, unscannable, breakpoints: Array.from(votes.values()) }
}

/**
 * Classes ayant au moins une règle dans les feuilles lisibles de la page (hors feuille
 * `ignoreStyleId`, celle injectée par DevWind). Construit en un seul parcours du CSSOM, pour
 * être mis en cache par l'appelant plutôt que de reparcourir toutes les règles à chaque édition.
 */
export function collectClassesWithRules(doc: Document = document, ignoreStyleId?: string): Set<string> {
  const classes = new Set<string>()
  const add = (cls: string) => classes.add(cls)
  for (const sheet of Array.from(doc.styleSheets)) {
    if (isIgnoredSheet(sheet, ignoreStyleId)) continue
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    if (rules) walkRules(rules, add)
  }
  return classes
}

const STYLESHEET_SELECTOR = 'link[rel="stylesheet"], style'

/**
 * Prévient `onChange` (avec un debounce, pour absorber les ajouts en rafale d'un même rendu)
 * quand les feuilles de style de la page changent après le scan initial : `<link
 * rel="stylesheet">`/`<style>` ajouté ou retiré (route SPA, composant lazy-loadé...), ou contenu
 * d'un `<style>` remplacé (HMR). Les nœuds d'id `ignoreId` (la feuille que DevWind injecte
 * lui-même à chaque édition) sont ignorés : ils déclencheraient un rescan complet pour rien.
 * Retourne une fonction de nettoyage.
 */
export function watchForStylesheetChanges(onChange: () => void, doc: Document = document, ignoreId?: string): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const isForeignStylesheet = (node: Node) => node instanceof Element && node.id !== ignoreId && node.matches(STYLESHEET_SELECTOR)
  const isRelevant = (m: MutationRecord) =>
    isForeignStylesheet(m.target) || Array.from(m.addedNodes).some(isForeignStylesheet) || Array.from(m.removedNodes).some(isForeignStylesheet)

  const observer = new MutationObserver((mutations) => {
    if (!mutations.some(isRelevant)) return
    if (debounceTimer != null) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(onChange, 300)
  })

  observer.observe(doc.documentElement, { childList: true, subtree: true })

  return () => {
    if (debounceTimer != null) clearTimeout(debounceTimer)
    observer.disconnect()
  }
}
