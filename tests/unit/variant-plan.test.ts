import { describe, expect, it } from 'vitest'
import { planVariants, wrapMedia } from '../../src/core/variant-plan'

describe('planVariants', () => {
  it('sans variant : plan vide', () => {
    expect(planVariants([])).toEqual({ selectorPrefix: '', selectorSuffix: '', mediaQueries: [], hasDark: false })
  })

  it('breakpoints min et max, syntaxe v3', () => {
    expect(planVariants(['md'])?.mediaQueries).toEqual(['(min-width: 768px)'])
    expect(planVariants(['max-lg'])?.mediaQueries).toEqual(['not all and (min-width: 1024px)'])
  })

  it('breakpoints du site : seuils personnalisés et noms en plus', () => {
    const site = { sm: '480px', '3xl': '1920px' }
    expect(planVariants(['sm'], site)?.mediaQueries).toEqual(['(min-width: 480px)'])
    expect(planVariants(['max-3xl'], site)?.mediaQueries).toEqual(['not all and (min-width: 1920px)'])
    expect(planVariants(['md'], site)).toBeNull()
  })

  it('pseudo-classes simples cumulées', () => {
    expect(planVariants(['hover', 'focus-visible'])?.selectorSuffix).toBe(':hover:focus-visible')
  })

  it('group-* / peer-*', () => {
    expect(planVariants(['group-hover'])?.selectorPrefix).toBe('.group:hover ')
    expect(planVariants(['peer-focus'])?.selectorPrefix).toBe('.peer:focus ~ ')
    expect(planVariants(['group-inconnu'])).toBeNull()
  })

  it('aria-* booléens', () => {
    expect(planVariants(['aria-checked'])?.selectorSuffix).toBe('[aria-checked="true"]')
  })

  it('dark', () => {
    expect(planVariants(['dark'])?.hasDark).toBe(true)
  })

  it('has-[…] : décode `_` et refuse un fragment déséquilibré', () => {
    expect(planVariants(['has-[>_img]'])?.selectorSuffix).toBe(':has(> img)')
    expect(planVariants(['has-[a),body_*,x:has(b]'])).toBeNull()
  })

  it('data-[…] : valeur avec ou sans guillemets, clé restreinte', () => {
    expect(planVariants(['data-[state=open]'])?.selectorSuffix).toBe('[data-state="open"]')
    expect(planVariants(['data-[state="open"]'])?.selectorSuffix).toBe('[data-state="open"]')
    expect(planVariants(['data-[open]'])?.selectorSuffix).toBe('[data-open]')
    expect(planVariants(['data-[a]{x]'])).toBeNull()
  })

  it('variant inconnu : null', () => {
    expect(planVariants(['print-only'])).toBeNull()
  })
})

describe('wrapMedia', () => {
  it('imbrique les media queries', () => {
    expect(wrapMedia('.a { color: red }', ['(min-width: 768px)'])).toBe('@media (min-width: 768px) { .a { color: red } }')
    expect(wrapMedia('.a {}', [])).toBe('.a {}')
  })
})
