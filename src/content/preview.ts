import { applyClassEdit } from '../core/class-diff'
import { getClassAttr, setClassAttr } from '../core/class-attr'
import { ensureLiveRule } from './live-injection'
import type { ClassEdit } from '../types'

// Aperçu au survol d'une valeur dans le panneau : l'édition est appliquée temporairement, sans
// historique, toujours à partir de l'état réel de l'élément (un nouveau survol remplace le
// précédent au lieu de s'y cumuler), puis annulée ou remplacée par l'édition réelle.
let previewEl: Element | null = null
let previewBase: string | null = null

export function previewEdit(el: Element, edit: ClassEdit): void {
  if (previewEl !== el) {
    cancelPreview()
    previewEl = el
    previewBase = el.getAttribute('class')
  } else {
    restoreBase(el)
  }
  if (edit.add) ensureLiveRule(edit.add, edit.liveRule)
  applyClassEdit(el, edit)
}

function restoreBase(el: Element) {
  if (previewBase === null) el.removeAttribute('class')
  else if (getClassAttr(el) !== previewBase) setClassAttr(el, previewBase)
}

/** Remet l'élément dans son état réel ; à appeler avant toute édition, annulation ou lecture des
 * classes. `true` si un aperçu était en cours. */
export function cancelPreview(): boolean {
  if (!previewEl) return false
  if (previewEl.isConnected) restoreBase(previewEl)
  previewEl = null
  previewBase = null
  return true
}
