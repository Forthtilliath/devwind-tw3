import { describe, expect, it } from 'vitest'
import { matchTaxonomy } from '../../src/core/class-parser'

function match(base: string) {
  const m = matchTaxonomy(base)
  return m && { id: m.entry.id, prefix: m.prefix, suffix: m.suffix, isArbitrary: m.isArbitrary, isNegative: m.isNegative }
}

describe('matchTaxonomy', () => {
  it('reconnaît les classes static (avec ou sans préfixe)', () => {
    expect(match('flex')).toMatchObject({ id: 'display', prefix: '', suffix: 'flex' })
    expect(match('text-left')).toMatchObject({ id: 'textAlign', prefix: 'text', suffix: 'left' })
  })

  it('désambiguïse un préfixe partagé grâce au dataset', () => {
    expect(match('text-xl')).toMatchObject({ id: 'fontSize', suffix: 'xl' })
    expect(match('text-red-500')).toMatchObject({ id: 'textColor', suffix: 'red-500' })
  })

  it('distingue les côtés d’une entrée multi-préfixes', () => {
    expect(match('pt-8')).toMatchObject({ id: 'padding', prefix: 'pt', suffix: '8' })
    expect(match('px-3')).toMatchObject({ id: 'padding', prefix: 'px', suffix: '3' })
  })

  it('gère les valeurs négatives des entrées qui les supportent', () => {
    expect(match('-mt-4')).toMatchObject({ id: 'margin', prefix: 'mt', isNegative: true })
    expect(match('-pt-4')).toBeNull()
  })

  it('gère la forme nue (clé DEFAULT)', () => {
    expect(match('rounded')).toMatchObject({ id: 'borderRadius', prefix: 'rounded', suffix: '' })
  })

  it('gère le modificateur d’opacité', () => {
    expect(match('bg-red-500/80')).toMatchObject({ id: 'backgroundColor', suffix: 'red-500/80', isArbitrary: false })
  })

  it('gère les valeurs arbitraires, avec ou sans opacité', () => {
    expect(match('bg-[#ff0000]')).toMatchObject({ id: 'backgroundColor', suffix: '#ff0000', isArbitrary: true })
    expect(match('bg-[#ff0000]/50')).toMatchObject({ id: 'backgroundColor', suffix: '#ff0000/50', isArbitrary: true })
  })

  it('ne confond pas une classe custom qui partage un préfixe', () => {
    expect(match('my-custom-btn')).toBeNull()
    expect(match('btn-primary')).toBeNull()
  })
})
