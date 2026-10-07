import { describe, expect, it } from 'vitest'
import { compositeOver, contrastRatio, relativeLuminance } from '../../src/core/contrast'
import { colorAlpha } from '../../src/core/color-alpha'

const BLACK = { r: 0, g: 0, b: 0 }
const WHITE = { r: 255, g: 255, b: 255 }

describe('contraste WCAG', () => {
  it('luminance relative', () => {
    expect(relativeLuminance(BLACK)).toBe(0)
    expect(relativeLuminance(WHITE)).toBeCloseTo(1)
  })

  it('ratio de contraste, symétrique', () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21)
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21)
    expect(contrastRatio(WHITE, WHITE)).toBe(1)
    // #767676 sur blanc : seuil AA classique (≈ 4.54:1)
    expect(contrastRatio({ r: 118, g: 118, b: 118 }, WHITE)).toBeCloseTo(4.54, 2)
  })
})

describe('compositeOver', () => {
  it('opaque : la couleur du dessus', () => {
    expect(compositeOver({ ...BLACK, a: 1 }, WHITE)).toEqual(BLACK)
  })

  it('transparent : le fond', () => {
    expect(compositeOver({ ...BLACK, a: 0 }, WHITE)).toEqual(WHITE)
  })

  it('mi-transparent : moyenne', () => {
    expect(compositeOver({ ...BLACK, a: 0.5 }, WHITE)).toEqual({ r: 128, g: 128, b: 128 })
  })
})

describe('colorAlpha', () => {
  it('transparent et couleurs opaques', () => {
    expect(colorAlpha('transparent')).toBe(0)
    expect(colorAlpha('rgb(0, 0, 0)')).toBe(1)
    expect(colorAlpha('oklch(0.6 0.2 30)')).toBe(1)
  })

  it('syntaxe à virgules', () => {
    expect(colorAlpha('rgba(0, 0, 0, 0.5)')).toBe(0.5)
    expect(colorAlpha('rgba(0, 0, 0, 0)')).toBe(0)
  })

  it('syntaxe moderne avec `/`', () => {
    expect(colorAlpha('oklch(0.6 0.2 30 / 0.25)')).toBe(0.25)
    expect(colorAlpha('color(srgb 1 0 0 / 50%)')).toBe(0.5)
  })

  it('borne entre 0 et 1', () => {
    expect(colorAlpha('rgba(0, 0, 0, 2)')).toBe(1)
  })
})
