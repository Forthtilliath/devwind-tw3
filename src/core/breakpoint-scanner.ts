import { extractClassSelectors, isGroupingRule, isRuleWithSelector } from './css-selectors'
import { splitVariants } from './split-variants'
import type { BreakpointVote } from '../types'

// Côté page : recense, dans les media queries de largeur du CSS du site, quels variants de tête
// elles accompagnent — `@media (min-width: 640px) { .sm\:flex {…} }` vote `sm = 640px`. Tailwind
// v3 inline les `theme.screens` du `tailwind.config.js` dans ces media queries, seule trace des
// breakpoints personnalisés du site. Le panneau en déduit les noms (cf. `breakpointsFromVotes`).

// v3 : `(min-width: X)` / `not all and (min-width: X)` (`max-*`, v3.2+) ; formes v4 `(width >= X)`
// / `(width < X)` aussi acceptées (CSS d'un autre outil, coût nul).
const MIN_RE = /^\(\s*(?:min-width\s*:|width\s*>=)\s*([\d.]+(?:px|rem|em))\s*\)$/
const MAX_RE = /^(?:not\s+all\s+and\s+\(\s*min-width\s*:|\(\s*width\s*<)\s*([\d.]+(?:px|rem|em))\s*\)$/

/** Plafond de votes distincts : quelques breakpoints × variantes de préfixe suffisent largement. */
const MAX_VOTES = 200

function widthCondition(rule: CSSRule): { op: 'min' | 'max'; length: string } | null {
  if (!('media' in rule)) return null
  const text = ((rule as CSSMediaRule).conditionText ?? (rule as CSSMediaRule).media.mediaText).trim()
  const min = MIN_RE.exec(text)
  if (min) return { op: 'min', length: min[1] }
  const max = MAX_RE.exec(text)
  return max ? { op: 'max', length: max[1] } : null
}

function voteForRules(rules: CSSRuleList, op: 'min' | 'max', length: string, votes: Map<string, BreakpointVote>) {
  for (const rule of Array.from(rules)) {
    if (isRuleWithSelector(rule)) {
      for (const cls of extractClassSelectors(rule.selectorText)) {
        const { variants } = splitVariants(cls)
        if (variants.length === 0) continue
        const [first, second = ''] = variants
        const key = `${first}\n${second}\n${op}\n${length}`
        const vote = votes.get(key)
        if (vote) vote[4]++
        else if (votes.size < MAX_VOTES) votes.set(key, [first, second, op, length, 1])
      }
    }
    if (isGroupingRule(rule) && rule.cssRules.length > 0) voteForRules(rule.cssRules, op, length, votes)
  }
}

/** Parcourt `rules` ; seule la media query de largeur la plus externe vote (celle du premier
 * variant de la classe, Tailwind imbriquant les variants dans leur ordre d'écriture). */
export function collectBreakpointVotes(rules: CSSRuleList, votes: Map<string, BreakpointVote>): void {
  for (const rule of Array.from(rules)) {
    const condition = widthCondition(rule)
    if (condition && isGroupingRule(rule)) {
      voteForRules(rule.cssRules, condition.op, condition.length, votes)
      continue
    }
    if (isGroupingRule(rule) && rule.cssRules.length > 0) collectBreakpointVotes(rule.cssRules, votes)
  }
}
