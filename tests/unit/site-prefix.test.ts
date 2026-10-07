// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { collectPrefixCandidates } from '../../src/core/prefix-candidates'
import { pickSitePrefix } from '../../src/core/site-prefix'

function docWith(html: string): Document {
  const doc = document.implementation.createHTMLDocument()
  doc.body.innerHTML = html
  return doc
}

describe('collectPrefixCandidates', () => {
  it('propose les coupures après les deux premiers tirets, variants et signe négatif gérés', () => {
    const doc = docWith('<div class="tw-p-4 md:tw-p-4 -tw-mt-2"></div><span class="flex"></span>')
    expect(collectPrefixCandidates(doc)).toEqual([
      ['tw-', 'p-4', 2],
      ['tw-p-', '4', 2],
      ['tw-', '-mt-2', 1],
      ['tw-mt-', '-2', 1],
    ])
  })
})

describe('pickSitePrefix', () => {
  it('retient le préfixe dont le reste est une classe Tailwind, à partir de 3 occurrences', () => {
    expect(pickSitePrefix([['tw-', 'p-4', 2], ['tw-', 'bg-red-500', 1], ['tw-p-', '4', 2]])).toBe('tw-')
    expect(pickSitePrefix([['tw-', 'p-4', 2]])).toBeNull()
  })

  it('ignore les classes déjà Tailwind telles quelles (`min-h-full` ≠ `min-` + `h-full`)', () => {
    expect(pickSitePrefix([['min-', 'h-full', 10], ['tw-', 'flex', 3]])).toBe('tw-')
  })
})
