import { describe, expect, it } from 'vitest'
import { declarationsFor } from '../../src/core/live-style'

describe('declarationsFor (valeurs littérales v3)', () => {
  it('spacing : valeur du thème inlinée, négatif compris', () => {
    expect(declarationsFor('p-4')).toEqual(['padding: 1rem'])
    expect(declarationsFor('-mt-2')).toEqual(['margin-top: -0.5rem'])
  })

  it('couleur : hex du thème par défaut, sans variable CSS', () => {
    expect(declarationsFor('bg-red-500')).toEqual(['background-color: #ef4444'])
  })

  it('couleur avec opacité : color-mix', () => {
    expect(declarationsFor('bg-red-500/50')).toEqual(['background-color: color-mix(in srgb, #ef4444 50%, transparent)'])
  })

  it('static : valeur traduite si besoin', () => {
    expect(declarationsFor('flex')).toEqual(['display: flex'])
    expect(declarationsFor('resize-x')).toEqual(['resize: horizontal'])
  })

  it('fontSize : line-height apparié littéral', () => {
    expect(declarationsFor('text-sm')).toEqual(['font-size: 0.875rem', 'line-height: 1.25rem'])
  })

  it('valeur arbitraire : `_` -> espace, sauf dans url()', () => {
    expect(declarationsFor('w-[calc(100%_-_2rem)]')).toEqual(['width: calc(100% - 2rem)'])
    expect(declarationsFor('bg-[rgb(0_0_0)]')).toEqual(['background-color: rgb(0 0 0)'])
  })

  it('transforms : variable + formule `transform` partagée (scale, rotate, translate, skew)', () => {
    for (const cls of ['scale-105', 'rotate-45', 'translate-x-4', 'skew-y-3']) {
      const decls = declarationsFor(cls)
      expect(decls?.at(-1)).toMatch(/^transform: translate\(var\(--tw-translate-x, 0\).*scaleY\(var\(--tw-scale-y, 1\)\)$/)
    }
    expect(declarationsFor('rotate-45')?.[0]).toBe('--tw-rotate: 45deg')
  })

  it('classe inconnue : null', () => {
    expect(declarationsFor('btn-primary')).toBeNull()
  })
})
