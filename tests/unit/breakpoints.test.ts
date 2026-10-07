// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { breakpointsFromVotes, sortedBreakpointNames } from '../../src/core/breakpoints'
import { collectBreakpointVotes } from '../../src/core/breakpoint-scanner'
import type { BreakpointVote } from '../../src/types'

function votesFor(css: string): BreakpointVote[] {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css)
  const votes = new Map<string, BreakpointVote>()
  collectBreakpointVotes(sheet.cssRules, votes)
  return Array.from(votes.values())
}

describe('collectBreakpointVotes', () => {
  it('lit les media queries v3 (min et max) autour des classes à variant', () => {
    const votes = votesFor(`
      @media (min-width: 640px) { .sm\\:flex { display: flex } }
      @media not all and (min-width: 1024px) { .max-lg\\:hidden { display: none } }
      @media (min-width: 768px) { .md\\:block { display: block } }
      @media (min-width: 768px) { .container { max-width: 768px } }
      @media print { .print\\:hidden { display: none } }
    `)
    expect(votes).toEqual(
      expect.arrayContaining([
        ['sm', '', 'min', '640px', 1],
        ['max-lg', '', 'max', '1024px', 1],
        ['md', '', 'min', '768px', 1],
      ]),
    )
    expect(votes).toHaveLength(3)
  })
})

describe('breakpointsFromVotes', () => {
  it('déduit les noms, retire `max-`, garde le seuil majoritaire', () => {
    const votes: BreakpointVote[] = [
      ['sm', '', 'min', '480px', 5],
      ['sm', '', 'min', '640px', 1],
      ['max-3xl', '', 'max', '1920px', 2],
      ['hover', '', 'max', '10rem', 1],
      ['min-[600px]', '', 'min', '600px', 1],
    ]
    expect(breakpointsFromVotes(votes)).toEqual({ sm: '480px', '3xl': '1920px' })
  })
})

describe('sortedBreakpointNames', () => {
  it('trie par seuil, unités mélangées', () => {
    expect(sortedBreakpointNames({ lg: '64rem', xs: '320px', md: '48rem' })).toEqual(['xs', 'md', 'lg'])
  })
})
