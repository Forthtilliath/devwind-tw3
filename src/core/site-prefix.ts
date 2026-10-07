import { matchTaxonomy } from './class-parser'
import type { PrefixCandidate } from '../types'

/**
 * Côté panneau, fin de la détection heuristique du préfixe de site : parmi les coupures
 * proposées par la page (cf. prefix-candidates.ts), seules comptent celles dont le reste est une
 * vraie classe Tailwind ET dont la classe entière n'en est pas déjà une (`min-h-full` n'est pas
 * `min-` + `h-full`). Le préfixe le plus fréquent est retenu à partir de 3 occurrences.
 * Informatif en v3 : une classe préfixée n'est pas reconnue par la taxonomie (le préfixe fait
 * partie du nom), elle reste listée dans les classes custom.
 */
export function pickSitePrefix(candidates: PrefixCandidate[]): string | null {
  const totals = new Map<string, number>()
  for (const [prefix, rest, count] of candidates) {
    if (matchTaxonomy(rest) === null) continue
    const whole = rest.startsWith('-') ? `-${prefix}${rest.slice(1)}` : `${prefix}${rest}`
    if (matchTaxonomy(whole) !== null) continue
    totals.set(prefix, (totals.get(prefix) ?? 0) + count)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [prefix, count] of totals) {
    if (count > bestCount) {
      best = prefix
      bestCount = count
    }
  }
  return bestCount >= 3 ? best : null
}
