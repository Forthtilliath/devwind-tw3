// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { applyClassEdit } from '../../src/core/class-diff'
import { clearChangeLog, finalClasses, getChangeLog, logChange, revertEntry } from '../../src/content/change-log'
import { pickRedoTarget, pickUndoTarget } from '../../src/devpanel/store/history'

afterEach(() => {
  clearChangeLog()
  document.body.innerHTML = ''
})

function setup() {
  document.body.innerHTML = '<button id="b" class="bg-red-500 p-4"></button>'
  return document.getElementById('b')!
}

const noRules = new Map()

describe('historique : annuler / rétablir', () => {
  it('annule par diff inverse en gardant les autres modifications', () => {
    const el = setup()
    const first = logChange(el, applyClassEdit(el, { remove: ['bg-red-500'], add: 'bg-black' }))!
    logChange(el, applyClassEdit(el, { remove: ['p-4'], add: 'p-8' }))

    const outcome = revertEntry(first.id, true, noRules)
    expect(outcome?.ok).toBe(true)
    expect(el.getAttribute('class')!.split(' ').sort()).toEqual(['bg-red-500', 'p-8'])

    const redo = revertEntry(first.id, false, noRules)
    expect(redo?.ok).toBe(true)
    expect(el.getAttribute('class')!.split(' ').sort()).toEqual(['bg-black', 'p-8'])
  })

  it('refuse si les classes ont été modifiées depuis, ou si l’élément a quitté la page', () => {
    const el = setup()
    const first = logChange(el, applyClassEdit(el, { remove: ['bg-red-500'], add: 'bg-black' }))!
    logChange(el, applyClassEdit(el, { remove: ['bg-black'], add: 'bg-blue-500' }))
    expect(revertEntry(first.id, true, noRules)).toEqual({ ok: false, reason: 'modified' })

    const last = getChangeLog()[1]
    el.remove()
    expect(revertEntry(last.id, true, noRules)).toEqual({ ok: false, reason: 'detached' })
  })

  it('le clavier vise la dernière modification, puis la dernière annulation tant que rien de neuf', () => {
    const el = setup()
    logChange(el, applyClassEdit(el, { remove: ['bg-red-500'], add: 'bg-black' }))
    const second = logChange(el, applyClassEdit(el, { remove: ['p-4'], add: 'p-8' }))!
    expect(pickUndoTarget(getChangeLog())?.id).toBe(second.id)
    expect(pickRedoTarget(getChangeLog())).toBeNull()

    revertEntry(second.id, true, noRules)
    expect(pickRedoTarget(getChangeLog())?.id).toBe(second.id)

    // Une nouvelle modification ferme la pile de rétablissement.
    logChange(el, applyClassEdit(el, { remove: [], add: 'flex' }))
    expect(pickRedoTarget(getChangeLog())).toBeNull()
  })
})

describe('finalClasses', () => {
  it('exporte les éléments modifiés, sauf ceux revenus à leur état d’origine', () => {
    document.body.innerHTML = '<p id="a" class="x"></p><p id="b" class="y"></p>'
    const a = document.getElementById('a')!
    const b = document.getElementById('b')!
    logChange(a, applyClassEdit(a, { remove: ['x'], add: 'z' }))
    const onB = logChange(b, applyClassEdit(b, { remove: [], add: 'w' }))!
    revertEntry(onB.id, true, noRules)
    expect(finalClasses()).toEqual([{ selector: 'p#a', classes: ['z'] }])
  })
})
