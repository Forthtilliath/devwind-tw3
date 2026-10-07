// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { addRawClass, applyClassEdit, removeRawClass } from '../../src/core/class-diff'
import { planClassEdit } from '../../src/core/class-edit-plan'

describe('planClassEdit', () => {
  it('retire la classe du même slot', () => {
    const edit = planClassEdit(['flex', 'bg-red-500', 'p-4'], { taxonomyId: 'backgroundColor', prefix: 'bg', variants: [], newBase: 'bg-blue-500' })
    expect(edit).toEqual({ remove: ['bg-red-500'], add: 'bg-blue-500' })
  })

  it('ne touche pas aux autres côtés d’une entrée multi-préfixes', () => {
    const edit = planClassEdit(['px-3', 'pt-2'], { taxonomyId: 'padding', prefix: 'pt', variants: [], newBase: 'pt-8' })
    expect(edit).toEqual({ remove: ['pt-2'], add: 'pt-8' })
  })

  it('isole chaque contexte de variant (ordre des variants indifférent)', () => {
    const edit = planClassEdit(['bg-red-500', 'hover:md:bg-red-700'], { taxonomyId: 'backgroundColor', prefix: 'bg', variants: ['md', 'hover'], newBase: 'bg-green-500' })
    expect(edit).toEqual({ remove: ['hover:md:bg-red-700'], add: 'md:hover:bg-green-500' })
  })

  it('vide le slot quand newBase est null', () => {
    const edit = planClassEdit(['flex', 'bg-red-500'], { taxonomyId: 'backgroundColor', prefix: 'bg', variants: [], newBase: null })
    expect(edit).toEqual({ remove: ['bg-red-500'], add: null })
  })

  it('dédoublonne les conflits déjà présents', () => {
    const edit = planClassEdit(['bg-red-500', 'bg-blue-500'], { taxonomyId: 'backgroundColor', prefix: 'bg', variants: [], newBase: 'bg-green-500' })
    expect(edit.remove).toEqual(['bg-red-500', 'bg-blue-500'])
  })
})

function el(classes: string): Element {
  const div = document.createElement('div')
  div.setAttribute('class', classes)
  return div
}

describe('applyClassEdit', () => {
  it('retire puis ajoute', () => {
    const e = el('flex bg-red-500 p-4')
    expect(applyClassEdit(e, { remove: ['bg-red-500'], add: 'bg-blue-500' })).toEqual({ before: 'flex bg-red-500 p-4', after: 'flex p-4 bg-blue-500' })
  })

  it('ignore une classe à retirer absente de l’élément', () => {
    const e = el('flex')
    applyClassEdit(e, { remove: ['bg-red-500'], add: null })
    expect(e.getAttribute('class')).toBe('flex')
  })

  it('fonctionne sur un élément SVG (className = SVGAnimatedString)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'w-4 h-4')
    applyClassEdit(svg, { remove: ['w-4'], add: 'w-6' })
    expect(svg.getAttribute('class')).toBe('h-4 w-6')
  })
})

describe('removeRawClass / addRawClass', () => {
  it('retire une classe précise', () => {
    const e = el('flex custom-a p-4')
    expect(removeRawClass(e, 'custom-a').after).toBe('flex p-4')
  })

  it('ajoute une classe sans doublon', () => {
    const e = el('flex')
    addRawClass(e, 'custom-a')
    addRawClass(e, 'custom-a')
    expect(e.getAttribute('class')).toBe('flex custom-a')
  })
})
