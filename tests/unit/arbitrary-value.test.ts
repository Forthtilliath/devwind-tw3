import { describe, expect, it } from 'vitest'
import { decodeArbitraryValue, unquote } from '../../src/core/arbitrary-value'

describe('decodeArbitraryValue', () => {
  it('convertit `_` en espace', () => {
    expect(decodeArbitraryValue('1fr_2fr')).toBe('1fr 2fr')
    expect(decodeArbitraryValue('rgb(0_0_0)')).toBe('rgb(0 0 0)')
  })

  it('garde un vrai underscore échappé', () => {
    expect(decodeArbitraryValue('a\\_b')).toBe('a_b')
  })

  it('ne touche pas aux underscores d’une url()', () => {
    expect(decodeArbitraryValue('url(/img/my_file.png)')).toBe('url(/img/my_file.png)')
    expect(decodeArbitraryValue('url(/a_b.png)_center')).toBe('url(/a_b.png) center')
  })
})

describe('unquote', () => {
  it('retire une paire de guillemets englobante', () => {
    expect(unquote('"open"')).toBe('open')
    expect(unquote("'open'")).toBe('open')
  })

  it('laisse le reste intact', () => {
    expect(unquote('open')).toBe('open')
    expect(unquote('"open\'')).toBe('"open\'')
  })
})
