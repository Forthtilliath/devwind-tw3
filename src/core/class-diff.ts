import { matchTaxonomy, splitVariants } from './class-parser'
import type { ClassChangeRequest, ClassChangeResult } from '../types'

export type { ClassChangeRequest, ClassChangeResult }

function sameVariantSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((v, i) => v === sortedB[i])
}

/**
 * Retire toutes les classes appartenant au même "slot" (même entrée de taxonomie +
 * même contexte de variant) puis ajoute la nouvelle classe. Dédoublonne au passage
 * les conflits déjà présents sur l'élément (ex. deux classes `bg-*` en même temps).
 */
export function applyClassChange(el: Element, request: ClassChangeRequest): ClassChangeResult {
  const before = el.className
  const current = before.split(/\s+/).filter(Boolean)

  const kept = current.filter((raw) => {
    const { variants, base } = splitVariants(raw)
    if (!sameVariantSet(variants, request.variants)) return true
    const match = matchTaxonomy(base)
    if (!match || match.entry.id !== request.taxonomyId) return true
    return match.prefix !== request.prefix
  })

  const next = request.newBase
    ? [...kept, [...request.variants, request.newBase].join(':')]
    : kept

  el.className = next.join(' ')
  return { before, after: el.className }
}

/** Retire une classe brute précise (ex. suppression d'un chip), sans passer par la taxonomie. */
export function removeRawClass(el: Element, rawClass: string): ClassChangeResult {
  const before = el.className
  const next = before.split(/\s+/).filter((c) => c && c !== rawClass)
  el.className = next.join(' ')
  return { before, after: el.className }
}

/** Ajoute une classe brute précise (ex. classe custom cochée dans le panneau), sans doublon. */
export function addRawClass(el: Element, rawClass: string): ClassChangeResult {
  const before = el.className
  const current = before.split(/\s+/).filter(Boolean)
  if (!current.includes(rawClass)) current.push(rawClass)
  el.className = current.join(' ')
  return { before, after: el.className }
}
