import { matchTaxonomy, splitVariants } from './class-parser'
import { joinVariants } from './split-variants'
import type { ClassChangeRequest, ClassEdit } from '../types'

function sameVariantSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((v, i) => v === sortedB[i])
}

/**
 * Côté panneau : classes à retirer (toutes celles du même "slot" — même entrée de taxonomie,
 * même préfixe, même contexte de variant) et classe à ajouter. Dédoublonne au passage les
 * conflits déjà présents sur l'élément (ex. deux classes `bg-*` en même temps). Appliqué tel
 * quel par le content script (cf. class-diff.ts, `applyClassEdit`).
 */
export function planClassEdit(classes: string[], request: ClassChangeRequest): Pick<ClassEdit, 'remove' | 'add'> {
  const remove = classes.filter((raw) => {
    const { variants, base } = splitVariants(raw)
    if (!sameVariantSet(variants, request.variants)) return false
    const match = matchTaxonomy(base)
    return match !== null && match.entry.id === request.taxonomyId && match.prefix === request.prefix
  })
  return { remove, add: request.newBase ? joinVariants(request.variants, request.newBase) : null }
}
