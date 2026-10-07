import { describe, expect, it } from 'vitest'
import { joinVariants, splitVariants } from '../../src/core/split-variants'

describe('splitVariants', () => {
  it('sépare variants et base', () => {
    expect(splitVariants('md:hover:bg-red-500')).toEqual({ raw: 'md:hover:bg-red-500', variants: ['md', 'hover'], base: 'bg-red-500' })
  })

  it('classe sans variant', () => {
    expect(splitVariants('flex')).toEqual({ raw: 'flex', variants: [], base: 'flex' })
  })

  it('ignore les `:` entre crochets (valeur arbitraire)', () => {
    expect(splitVariants('hover:bg-[url(https://x.dev:80/a.png)]')).toMatchObject({
      variants: ['hover'],
      base: 'bg-[url(https://x.dev:80/a.png)]',
    })
  })

  it('ignore les `:` dans un variant arbitraire', () => {
    expect(splitVariants('has-[a:hover]:p-4')).toMatchObject({ variants: ['has-[a:hover]'], base: 'p-4' })
  })
})

describe('joinVariants', () => {
  it('recompose la classe complète', () => {
    expect(joinVariants(['md', 'hover'], 'bg-red-500')).toBe('md:hover:bg-red-500')
    expect(joinVariants([], 'flex')).toBe('flex')
  })

  it('est l’inverse de splitVariants', () => {
    const cls = 'dark:md:bg-[url(https://x.dev:80/a.png)]'
    const { variants, base } = splitVariants(cls)
    expect(joinVariants(variants, base)).toBe(cls)
  })
})
