import { taxonomy } from '../data/taxonomy'
import generatedClasses from '../data/generated/tailwind-classes-slim.json'
import { hasRuleForClass } from './css-scanner'
import type { LiveRuleStatus, SlimGeneratedClass } from '../types'

const GENERATED_BY_CLASSNAME = new Map<string, SlimGeneratedClass>()
for (const c of generatedClasses as SlimGeneratedClass[]) GENERATED_BY_CLASSNAME.set(c.className, c)

const STYLE_ELEMENT_ID = 'devwind-live-styles'

// Plafond simple sur le nombre de règles injectées (pas de vrai ménage "cette classe est-elle
// encore dans le DOM", ça demanderait un MutationObserver global sur tout le document) : au-delà
// de MAX_INJECTED, on purge les plus anciennes jusqu'à PRUNE_TO. Suffisant pour éviter une
// croissance illimitée sur une session d'édition très longue, sans complexité superflue.
const MAX_INJECTED = 300
const PRUNE_TO = 250
const injected = new Map<string, Text>()

function getStyleEl(): HTMLStyleElement {
  let el = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ELEMENT_ID
    document.head.appendChild(el)
  }
  return el
}

function pruneIfNeeded() {
  if (injected.size <= MAX_INJECTED) return
  let toRemove = injected.size - PRUNE_TO
  for (const [key, node] of injected) {
    if (toRemove-- <= 0) break
    node.remove()
    injected.delete(key)
  }
}

/** Échappe un nom de classe Tailwind pour l'utiliser comme sélecteur CSS littéral. */
function cssEscape(className: string): string {
  return className.replace(/([:/[\].%#])/g, '\\$1')
}

// --- Valeurs : littérales (v3 n'expose pas son thème en variables CSS runtime) ---
//
// Contrairement à v4 (qui référence de vraies variables CSS `@theme`), Tailwind v3 compile
// chaque classe avec sa valeur de thème inlinée en dur (`.bg-red-500 { background-color: #ef4444
// }`, `.p-4 { padding: 1rem }` — pas de `calc(var(--spacing) * 4)` ni de `var(--color-red-500)`).
// Pas de scan de détection de thème custom possible sans parser le CSS compilé du site (hors
// scope) : on utilise directement la valeur littérale de notre dataset généré.

// --- Propriétés composites (transform / filter / backdrop-filter) ---
//
// Tailwind combine plusieurs classes indépendantes sur une même propriété via des variables CSS
// partagées (ex. `scale-105` et `rotate-45` doivent toutes les deux affecter `transform` sans
// s'écraser). Chaque classe composite pose SA variable ET réaffirme la formule complète de la
// propriété partagée — exactement le CSS que Tailwind génère lui-même, ce qui permet à
// n'importe quelle combinaison de classes de fonctionner par cascade. Fallback (`var(--x,
// defaut)`) dans chaque référence pour rester correct même sur un site sans preflight Tailwind.
// v3 (contrairement à v4) : `scale`/`rotate`/`translate`/`skew` sont TOUS composés via la même
// propriété `transform` unique (CSS n'avait pas encore de propriétés `scale`/`rotate`/`translate`
// natives séparées) — voir COMPOSITE_BY_PREFIX ci-dessous, tous sur `property: 'transform'`.
function transformFormula(): string {
  return (
    'translate(var(--tw-translate-x, 0), var(--tw-translate-y, 0)) ' +
    'rotate(var(--tw-rotate, 0)) skewX(var(--tw-skew-x, 0)) skewY(var(--tw-skew-y, 0)) ' +
    'scaleX(var(--tw-scale-x, 1)) scaleY(var(--tw-scale-y, 1))'
  )
}

const FILTER_VARS = ['--tw-blur', '--tw-brightness', '--tw-contrast', '--tw-grayscale', '--tw-hue-rotate', '--tw-invert', '--tw-saturate', '--tw-sepia', '--tw-drop-shadow']
function filterFormula(): string {
  return FILTER_VARS.map((v) => `var(${v},)`).join(' ')
}

const BACKDROP_FILTER_VARS = ['--tw-backdrop-blur', '--tw-backdrop-brightness', '--tw-backdrop-contrast', '--tw-backdrop-grayscale', '--tw-backdrop-hue-rotate', '--tw-backdrop-invert', '--tw-backdrop-opacity', '--tw-backdrop-saturate', '--tw-backdrop-sepia']
function backdropFilterFormula(): string {
  return BACKDROP_FILTER_VARS.map((v) => `var(${v},)`).join(' ')
}

interface CompositeSpec {
  /** Variables CSS que CE préfixe pose (2 pour `scale` bare : scale-x ET scale-y). */
  cssVars: string[]
  /** Enrobe la valeur dans la fonction attendue (`skewX(3deg)`), ou identité si la formule
   * partagée utilise déjà la valeur brute (`scale`/`translate`, propriétés natives). */
  wrap: (value: string) => string
  property: string
  formula: () => string
}

const COMPOSITE_BY_PREFIX: Record<string, CompositeSpec> = {
  scale: { cssVars: ['--tw-scale-x', '--tw-scale-y'], wrap: (v) => v, property: 'transform', formula: transformFormula },
  'scale-x': { cssVars: ['--tw-scale-x'], wrap: (v) => v, property: 'transform', formula: transformFormula },
  'scale-y': { cssVars: ['--tw-scale-y'], wrap: (v) => v, property: 'transform', formula: transformFormula },
  rotate: { cssVars: ['--tw-rotate'], wrap: (v) => v, property: 'transform', formula: transformFormula },
  'translate-x': { cssVars: ['--tw-translate-x'], wrap: (v) => v, property: 'transform', formula: transformFormula },
  'translate-y': { cssVars: ['--tw-translate-y'], wrap: (v) => v, property: 'transform', formula: transformFormula },
  'skew-x': { cssVars: ['--tw-skew-x'], wrap: (v) => v, property: 'transform', formula: transformFormula },
  'skew-y': { cssVars: ['--tw-skew-y'], wrap: (v) => v, property: 'transform', formula: transformFormula },

  blur: { cssVars: ['--tw-blur'], wrap: (v) => (v ? `blur(${v})` : ''), property: 'filter', formula: filterFormula },
  brightness: { cssVars: ['--tw-brightness'], wrap: (v) => `brightness(${v})`, property: 'filter', formula: filterFormula },
  contrast: { cssVars: ['--tw-contrast'], wrap: (v) => `contrast(${v})`, property: 'filter', formula: filterFormula },
  grayscale: { cssVars: ['--tw-grayscale'], wrap: (v) => `grayscale(${v})`, property: 'filter', formula: filterFormula },
  'hue-rotate': { cssVars: ['--tw-hue-rotate'], wrap: (v) => `hue-rotate(${v})`, property: 'filter', formula: filterFormula },
  invert: { cssVars: ['--tw-invert'], wrap: (v) => `invert(${v})`, property: 'filter', formula: filterFormula },
  saturate: { cssVars: ['--tw-saturate'], wrap: (v) => `saturate(${v})`, property: 'filter', formula: filterFormula },
  sepia: { cssVars: ['--tw-sepia'], wrap: (v) => `sepia(${v})`, property: 'filter', formula: filterFormula },

  'backdrop-blur': { cssVars: ['--tw-backdrop-blur'], wrap: (v) => (v ? `blur(${v})` : ''), property: 'backdrop-filter', formula: backdropFilterFormula },
  'backdrop-brightness': { cssVars: ['--tw-backdrop-brightness'], wrap: (v) => `brightness(${v})`, property: 'backdrop-filter', formula: backdropFilterFormula },
  'backdrop-contrast': { cssVars: ['--tw-backdrop-contrast'], wrap: (v) => `contrast(${v})`, property: 'backdrop-filter', formula: backdropFilterFormula },
  'backdrop-grayscale': { cssVars: ['--tw-backdrop-grayscale'], wrap: (v) => `grayscale(${v})`, property: 'backdrop-filter', formula: backdropFilterFormula },
  'backdrop-hue-rotate': { cssVars: ['--tw-backdrop-hue-rotate'], wrap: (v) => `hue-rotate(${v})`, property: 'backdrop-filter', formula: backdropFilterFormula },
  'backdrop-invert': { cssVars: ['--tw-backdrop-invert'], wrap: (v) => `invert(${v})`, property: 'backdrop-filter', formula: backdropFilterFormula },
  'backdrop-opacity': { cssVars: ['--tw-backdrop-opacity'], wrap: (v) => `opacity(${v})`, property: 'backdrop-filter', formula: backdropFilterFormula },
  'backdrop-saturate': { cssVars: ['--tw-backdrop-saturate'], wrap: (v) => `saturate(${v})`, property: 'backdrop-filter', formula: backdropFilterFormula },
  'backdrop-sepia': { cssVars: ['--tw-backdrop-sepia'], wrap: (v) => `sepia(${v})`, property: 'backdrop-filter', formula: backdropFilterFormula },
}

function compositeDeclarations(spec: CompositeSpec, value: string): string[] {
  const varDecls = spec.cssVars.map((v) => `${v}: ${spec.wrap(value)}`)
  // -webkit-backdrop-filter en plus (vérifié dans la sortie réelle v4) : coût nul, meilleure fidélité.
  const propDecls = spec.property === 'backdrop-filter' ? [`-webkit-backdrop-filter: ${spec.formula()}`, `${spec.property}: ${spec.formula()}`] : [`${spec.property}: ${spec.formula()}`]
  return [...varDecls, ...propDecls]
}

/**
 * Détermine les déclarations CSS (`propriété: valeur`) d'une classe "base" (sans variants),
 * à partir de la taxonomie + du dataset généré (classes connues) ou en parsant directement
 * une valeur arbitraire (`bg-[#ff0000]`, non présente dans le dataset généré — toujours
 * littérale, comme le vrai Tailwind). Gère aussi le modificateur d'opacité (`bg-red-500/80`,
 * `bg-[#ff0000]/50`) et les propriétés composites (scale/translate/skew/filter/backdrop-filter,
 * cf. COMPOSITE_BY_PREFIX).
 */
function declarationsFor(base: string): string[] | null {
  const opacitySplit = /^(.*)\/(\d{1,3})$/.exec(base)
  const withoutOpacity = opacitySplit ? opacitySplit[1] : base
  const opacityPct = opacitySplit ? Number(opacitySplit[2]) : null

  const generated = GENERATED_BY_CLASSNAME.get(withoutOpacity)
  if (generated) {
    const entry = taxonomy.find((e) => e.id === generated.taxonomyId)
    const props = entry?.cssProperties[generated.prefix]
    if (!entry || !props) return null

    if (entry.type === 'static') {
      const suffix = generated.prefix ? withoutOpacity.slice(generated.prefix.length + 1) : withoutOpacity
      const value = entry.staticValueMap?.[suffix] ?? suffix
      return props.map((p) => `${p}: ${value}`)
    }

    if (!generated.themeToken) return null
    let value = generated.negative ? `-${generated.themeToken}` : generated.themeToken
    if (opacityPct != null && entry.type === 'color') {
      value = `color-mix(in srgb, ${value} ${opacityPct}%, transparent)`
    }

    const composite = COMPOSITE_BY_PREFIX[generated.prefix]
    if (composite) return compositeDeclarations(composite, value)

    if (entry.id === 'fontSize') {
      const decls = [`font-size: ${value}`]
      if (generated.secondaryValue) decls.push(`line-height: ${generated.secondaryValue}`)
      return decls
    }

    return props.map((p) => `${p}: ${value}`)
  }

  const arbitraryMatch = /^(-?)([a-z][a-z-]*)-\[(.+)\]$/.exec(withoutOpacity)
  if (arbitraryMatch) {
    const [, neg, prefix, rawValue] = arbitraryMatch
    const entry = taxonomy.find((e) => e.prefixes.includes(prefix) && e.supportsArbitrary)
    const props = entry?.cssProperties[prefix]
    if (!entry || !props) return null

    let value = `${neg}${rawValue}`
    if (opacityPct != null && entry.type === 'color') {
      value = `color-mix(in srgb, ${value} ${opacityPct}%, transparent)`
    }

    const composite = COMPOSITE_BY_PREFIX[prefix]
    if (composite) return compositeDeclarations(composite, value)

    return props.map((p) => `${p}: ${value}`)
  }

  return null
}

// min-width standard des breakpoints Tailwind par défaut (sm/md/lg/xl/2xl) : suffisant pour
// synthétiser un `@media` fidèle sans dépendre du thème du site (les breakpoints sont rarement
// personnalisés, contrairement aux couleurs/spacing).
const BREAKPOINTS: Record<string, number> = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 }

// Pseudo-classes simples : suffixées directement au sélecteur de la classe.
const SIMPLE_PSEUDO: Record<string, string> = {
  hover: ':hover',
  focus: ':focus',
  'focus-visible': ':focus-visible',
  'focus-within': ':focus-within',
  active: ':active',
  disabled: ':disabled',
  first: ':first-child',
  last: ':last-child',
  odd: ':nth-child(odd)',
  even: ':nth-child(even)',
  visited: ':visited',
}

// Clés ARIA booléennes standard supportées par Tailwind (`aria-checked:` etc, sans crochets).
const ARIA_KEYS = new Set(['checked', 'disabled', 'expanded', 'hidden', 'pressed', 'readonly', 'required', 'selected', 'busy', 'invalid'])

interface VariantPlan {
  /** Combinateur ancêtre/frère préfixé au sélecteur (`.group:hover `, `.peer:hover ~ `). */
  selectorPrefix: string
  /** Pseudo-classe/attribut suffixé directement à la classe (`:hover`, `[aria-checked="true"]`). */
  selectorSuffix: string
  mediaQueries: string[]
  hasDark: boolean
}

/**
 * Interprète les variants (breakpoints, pseudo-classes, `group-*`/`peer-*`, `aria-*`, `has-*`,
 * `data-*`) en un plan de sélecteur/media-query. `group-*`/`peer-*`/`aria-*`/`has-*`/`data-*`
 * sont purement déclaratifs via combinateurs/sélecteurs CSS standards — pas besoin d'inspecter
 * le DOM, on réplique exactement le sélecteur que Tailwind génère lui-même. `null` si un
 * variant n'est pas géré de façon fiable.
 */
function planVariants(variants: string[]): VariantPlan | null {
  const plan: VariantPlan = { selectorPrefix: '', selectorSuffix: '', mediaQueries: [], hasDark: false }

  for (const v of variants) {
    if (v === 'dark') {
      plan.hasDark = true
      continue
    }
    if (BREAKPOINTS[v] != null) {
      plan.mediaQueries.push(`(min-width: ${BREAKPOINTS[v]}px)`)
      continue
    }
    if (v.startsWith('max-') && BREAKPOINTS[v.slice(4)] != null) {
      plan.mediaQueries.push(`(max-width: ${BREAKPOINTS[v.slice(4)] - 1}px)`)
      continue
    }
    if (SIMPLE_PSEUDO[v]) {
      plan.selectorSuffix += SIMPLE_PSEUDO[v]
      continue
    }

    const groupPeerMatch = /^(group|peer)-(.+)$/.exec(v)
    if (groupPeerMatch) {
      const [, kind, pseudo] = groupPeerMatch
      const pseudoSel = SIMPLE_PSEUDO[pseudo]
      if (!pseudoSel) return null
      plan.selectorPrefix += kind === 'group' ? `.group${pseudoSel} ` : `.peer${pseudoSel} ~ `
      continue
    }

    const ariaMatch = /^aria-(.+)$/.exec(v)
    if (ariaMatch && ARIA_KEYS.has(ariaMatch[1])) {
      plan.selectorSuffix += `[aria-${ariaMatch[1]}="true"]`
      continue
    }

    const hasMatch = /^has-\[(.+)\]$/.exec(v)
    if (hasMatch) {
      plan.selectorSuffix += `:has(${hasMatch[1]})`
      continue
    }

    const dataMatch = /^data-\[(.+)\]$/.exec(v)
    if (dataMatch) {
      const [key, value] = dataMatch[1].split('=')
      plan.selectorSuffix += value ? `[data-${key}="${value}"]` : `[data-${key}]`
      continue
    }

    return null // variant non géré de façon fiable
  }

  return plan
}

function wrapMedia(rule: string, queries: string[]): string {
  return queries.reduce((r, mq) => `@media ${mq} { ${r} }`, rule)
}

/** Les deux règles `dark:` synthétisées ont les mêmes déclarations et la même spécificité
 * (`:where()` en a zéro) : à égalité, seul l'ordre d'apparition dans la feuille tranche.
 * On émet en dernier la stratégie que le site utilise réellement en ce moment (`.dark` présent
 * sur `<html>`/`<body>` = stratégie classe ; sinon media query), pour que notre règle gagne
 * face à du vrai CSS du site qui ciblerait la même propriété avec une spécificité égale. */
function detectDarkStrategy(): 'class' | 'media' {
  const hasDarkClass = document.documentElement.classList.contains('dark') || document.body?.classList.contains('dark')
  return hasDarkClass ? 'class' : 'media'
}

/**
 * Garantit qu'une classe Tailwind (avec variants éventuels) a un effet visuel même si le CSS
 * de la page ne la définit pas (build de production purgé qui n'a jamais utilisé cette
 * classe) : synthétise la règle depuis notre taxonomie + le thème par défaut et l'injecte
 * avec `!important`, pour permettre de prévisualiser n'importe quelle valeur à tout moment,
 * même si elle n'existe pas "en vrai" sur le site. Ne fait rien si une règle réelle existe
 * déjà (on préfère toujours le vrai CSS du site, plus fidèle à son thème effectif, à notre
 * approximation par défaut).
 *
 * `dark:` émet systématiquement DEUX règles (`@media (prefers-color-scheme: dark)` ET
 * `:where(.dark, .dark *)`) plutôt que de deviner la stratégie du site (fiable, sans
 * heuristique DOM) : si le site n'utilise pas Tailwind dark mode, les deux restent inertes.
 */
export function ensureLiveRule(fullClassName: string): LiveRuleStatus {
  if (injected.has(fullClassName)) return 'synthesized'
  if (hasRuleForClass(fullClassName, document, STYLE_ELEMENT_ID)) return 'has-real-rule'

  const parts = fullClassName.split(':')
  const base = parts[parts.length - 1]
  const variants = parts.slice(0, -1)

  const decls = declarationsFor(base)
  if (!decls) return 'unsupported'

  const plan = planVariants(variants)
  if (!plan) return 'unsupported'

  const selector = `${plan.selectorPrefix}.${cssEscape(fullClassName)}${plan.selectorSuffix}`
  const importantDecls = decls.map((d) => `${d} !important`).join('; ')

  let output = ''
  if (plan.hasDark) {
    const mediaRule = wrapMedia(`${selector} { ${importantDecls}; }`, ['(prefers-color-scheme: dark)', ...plan.mediaQueries])
    const classRule = wrapMedia(`${selector}:where(.dark, .dark *) { ${importantDecls}; }`, plan.mediaQueries)
    const rules = detectDarkStrategy() === 'class' ? [mediaRule, classRule] : [classRule, mediaRule]
    output += `${rules.join('\n')}\n`
  } else {
    output += `${wrapMedia(`${selector} { ${importantDecls}; }`, plan.mediaQueries)}\n`
  }

  const textNode = document.createTextNode(output)
  getStyleEl().appendChild(textNode)
  injected.set(fullClassName, textNode)
  pruneIfNeeded()
  return 'synthesized'
}
