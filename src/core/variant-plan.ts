import { decodeArbitraryValue, unquote } from './arbitrary-value'
import { isBalancedSelectorFragment } from './css-guard'
import { DEFAULT_BREAKPOINTS } from './breakpoints'
import type { BreakpointMap } from './breakpoints'

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

export interface VariantPlan {
  /** Combinateur ancêtre/frère préfixé au sélecteur (`.group:hover `, `.peer:hover ~ `). */
  selectorPrefix: string
  /** Pseudo-classe/attribut suffixé directement à la classe (`:hover`, `[aria-checked="true"]`). */
  selectorSuffix: string
  mediaQueries: string[]
  hasDark: boolean
}

// Nom d'attribut `data-*` : lettres, chiffres, `-` et `_` uniquement (rien qui puisse fermer le
// sélecteur d'attribut ou en ouvrir un autre).
const DATA_KEY = /^[\w-]+$/

/** `data-[state=open]` / `data-[state="open"]` / `data-[open]` -> sélecteur d'attribut. Les
 * guillemets éventuels de la classe sont retirés (sinon `[data-state=""open""]`, invalide) puis
 * la valeur est ré-échappée pour rester entre nos propres guillemets. `null` si la clé est
 * invalide. */
function dataAttributeSelector(content: string): string | null {
  const eq = content.indexOf('=')
  const key = eq === -1 ? content : content.slice(0, eq)
  if (!DATA_KEY.test(key)) return null
  if (eq === -1) return `[data-${key}]`
  const value = unquote(decodeArbitraryValue(content.slice(eq + 1)))
  return `[data-${key}="${value.replace(/["\\]/g, '\\$&')}"]`
}

/**
 * Interprète les variants (breakpoints, pseudo-classes, `group-*`/`peer-*`, `aria-*`, `has-*`,
 * `data-*`) en un plan de sélecteur/media-query. `group-*`/`peer-*`/`aria-*`/`has-*`/`data-*`
 * sont purement déclaratifs via combinateurs/sélecteurs CSS standards — pas besoin d'inspecter
 * le DOM, on réplique exactement le sélecteur que Tailwind génère lui-même. `null` si un
 * variant n'est pas géré de façon fiable.
 *
 * `breakpoints` : seuils réels du site s'ils sont connus (cf. breakpoints.ts), écrits comme v3
 * les génère (`(min-width: 640px)` / `not all and (min-width: 640px)` pour `max-*`).
 */
export function planVariants(variants: string[], breakpoints: BreakpointMap = DEFAULT_BREAKPOINTS): VariantPlan | null {
  const plan: VariantPlan = { selectorPrefix: '', selectorSuffix: '', mediaQueries: [], hasDark: false }

  for (const v of variants) {
    if (v === 'dark') {
      plan.hasDark = true
      continue
    }
    if (Object.hasOwn(breakpoints, v)) {
      plan.mediaQueries.push(`(min-width: ${breakpoints[v]})`)
      continue
    }
    const maxBreakpoint = v.startsWith('max-') ? v.slice(4) : ''
    if (maxBreakpoint && Object.hasOwn(breakpoints, maxBreakpoint)) {
      plan.mediaQueries.push(`not all and (min-width: ${breakpoints[maxBreakpoint]})`)
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
      const inner = decodeArbitraryValue(hasMatch[1])
      if (!isBalancedSelectorFragment(inner)) return null
      plan.selectorSuffix += `:has(${inner})`
      continue
    }

    const dataMatch = /^data-\[(.+)\]$/.exec(v)
    if (dataMatch) {
      const attr = dataAttributeSelector(dataMatch[1])
      if (!attr) return null
      plan.selectorSuffix += attr
      continue
    }

    return null // variant non géré de façon fiable
  }

  return plan
}

export function wrapMedia(rule: string, queries: string[]): string {
  return queries.reduce((r, mq) => `@media ${mq} { ${r} }`, rule)
}
