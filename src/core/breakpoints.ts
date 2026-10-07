import type { BreakpointVote } from '../types'

/** Nom de breakpoint -> longueur CSS de son seuil (`640px`, `48rem`...), telle que le site l'écrit. */
export type BreakpointMap = Readonly<Record<string, string>>

// Breakpoints par défaut de Tailwind v3 (`theme.screens`, en px comme le CSS qu'il génère).
// Remplacés/complétés par ceux réellement utilisés par le site (media queries de son CSS
// compilé, cf. breakpoint-scanner.ts) dès que le panneau les connaît : en v3, c'est la seule
// trace du `tailwind.config.js` du site. Source unique pour la synthèse (variant-plan.ts) et la
// toolbar de variants du panneau.
export const DEFAULT_BREAKPOINTS: BreakpointMap = { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' }

const LENGTH_RE = /^(\d+(?:\.\d+)?|\.\d+)(px|rem|em)$/

export function isBreakpointLength(value: string): boolean {
  return LENGTH_RE.test(value)
}

/** Seuil approximatif en px (rem/em à 16px, comme une media query) : sert à trier, pas à rendre. */
export function breakpointPx(length: string): number {
  const m = LENGTH_RE.exec(length)
  if (!m) return Number.POSITIVE_INFINITY
  return m[2] === 'px' ? Number(m[1]) : Number(m[1]) * 16
}

/** Noms triés du plus petit au plus grand seuil (ordre d'affichage de la toolbar). */
export function sortedBreakpointNames(map: BreakpointMap): string[] {
  return Object.keys(map).sort((a, b) => breakpointPx(map[a]) - breakpointPx(map[b]))
}

const NAME_RE = /^[a-z0-9][a-z0-9-]*$/

/**
 * Breakpoints réellement utilisés par le site, déduits des votes collectés dans ses media
 * queries (cf. breakpoint-scanner.ts) : `(min-width: X)` autour de `.sm\:…` vote `sm = X`,
 * `not all and (min-width: X)` autour de `.max-sm\:…` aussi. En v3 le préfixe de site est collé
 * à l'utilitaire, jamais en variant : le breakpoint est toujours le premier variant. Pour un même
 * nom, le seuil le plus fréquent l'emporte.
 */
export function breakpointsFromVotes(votes: BreakpointVote[]): Record<string, string> {
  const tally = new Map<string, Map<string, number>>()
  for (const [first, , op, length, count] of votes) {
    let name = first
    if (op === 'max') {
      if (!name.startsWith('max-')) continue
      name = name.slice(4)
    }
    if (!NAME_RE.test(name) || name.startsWith('max-') || !isBreakpointLength(length)) continue
    const lengths = tally.get(name) ?? new Map<string, number>()
    lengths.set(length, (lengths.get(length) ?? 0) + count)
    tally.set(name, lengths)
  }
  const result: Record<string, string> = {}
  for (const [name, lengths] of tally) {
    result[name] = [...lengths.entries()].sort((a, b) => b[1] - a[1])[0][0]
  }
  return result
}
