import { splitVariants } from './split-variants'
import { readClassList } from './class-attr'
import type { PrefixCandidate } from '../types'

/** Coupures essayées par classe : un préfixe v3 se termine presque toujours par un tiret
 * (`tw-`, `my-app-`), et en contient rarement plus de deux. */
const MAX_CUTS = 2

/**
 * Côté page, partie DOM de la détection du préfixe de site (option `prefix` de Tailwind v3 —
 * concaténé DIRECTEMENT devant le nom, ex. `tw-bg-red-500`, et non un variant en tête comme
 * `tw:bg-red-500` en v4) : un seul parcours du DOM, qui propose pour chaque classe les coupures
 * après ses premiers tirets (`tw-` + `bg-red-500`). Le panneau, qui a la taxonomie, ne garde
 * que celles dont le reste est une vraie classe Tailwind (cf. site-prefix.ts).
 */
export function collectPrefixCandidates(doc: Document = document): PrefixCandidate[] {
  const counts = new Map<string, PrefixCandidate>()
  for (const el of Array.from(doc.querySelectorAll('[class]'))) {
    for (const raw of readClassList(el)) {
      const { base } = splitVariants(raw)
      const negative = base.startsWith('-')
      const working = negative ? base.slice(1) : base
      let cuts = 0
      for (let i = working.indexOf('-'); i !== -1 && cuts < MAX_CUTS; i = working.indexOf('-', i + 1)) {
        cuts++
        const prefix = working.slice(0, i + 1)
        const rest = working.slice(i + 1)
        if (!rest || !/^[a-z][a-z0-9-]*$/.test(prefix)) continue
        const restBase = negative ? `-${rest}` : rest
        const key = `${prefix}\n${restBase}`
        const candidate = counts.get(key)
        if (candidate) candidate[2]++
        else counts.set(key, [prefix, restBase, 1])
      }
    }
  }
  return Array.from(counts.values())
}
