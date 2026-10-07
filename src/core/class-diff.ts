import { getClassAttr, readClassList, setClassAttr } from './class-attr'
import type { ClassChangeResult, ClassEdit } from '../types'

// Écritures DOM côté content script, sans taxonomie ni dataset : le panneau calcule le diff
// (cf. class-edit-plan.ts) et la page se contente de l'appliquer.

/** Remplace la liste de classes de l'élément (via l'attribut `class`, cf. class-attr.ts). */
function writeClasses(el: Element, before: string, next: string[]): ClassChangeResult {
  setClassAttr(el, next.join(' '))
  return { before, after: getClassAttr(el) }
}

/** Retire les classes `remove` (même slot, calculé par le panneau) puis ajoute `add`. */
export function applyClassEdit(el: Element, edit: Pick<ClassEdit, 'remove' | 'add'>): ClassChangeResult {
  const before = getClassAttr(el)
  const kept = readClassList(el).filter((c) => !edit.remove.includes(c))
  return writeClasses(el, before, edit.add ? [...kept, edit.add] : kept)
}

/** Retire `remove` puis ajoute `add` (sans doublon) : annulation/rétablissement d'une entrée
 * de l'historique, qui peut concerner plusieurs classes à la fois. */
export function applyClassDiff(el: Element, remove: string[], add: string[]): ClassChangeResult {
  const before = getClassAttr(el)
  const kept = readClassList(el).filter((c) => !remove.includes(c))
  return writeClasses(el, before, [...kept, ...add.filter((c) => !kept.includes(c))])
}

/** Retire une classe brute précise (ex. suppression d'un chip), sans passer par la taxonomie. */
export function removeRawClass(el: Element, rawClass: string): ClassChangeResult {
  const before = getClassAttr(el)
  return writeClasses(el, before, readClassList(el).filter((c) => c !== rawClass))
}

/** Ajoute une classe brute précise (ex. classe custom cochée dans le panneau), sans doublon. */
export function addRawClass(el: Element, rawClass: string): ClassChangeResult {
  const before = getClassAttr(el)
  const current = readClassList(el)
  if (!current.includes(rawClass)) current.push(rawClass)
  return writeClasses(el, before, current)
}
