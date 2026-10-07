import type { TaxonomyEntry } from '../../types'

/** Espacement : padding, margin, gap. */
export const spacing: TaxonomyEntry[] = [
  {
    id: 'padding',
    category: 'Spacing',
    subcategory: 'Padding',
    prefixes: ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl'],
    cssProperties: {
      p: ['padding'],
      px: ['padding-left', 'padding-right'],
      py: ['padding-top', 'padding-bottom'],
      pt: ['padding-top'],
      pr: ['padding-right'],
      pb: ['padding-bottom'],
      pl: ['padding-left'],
    },
    themeKey: 'spacing',
    type: 'scale',
    supportsArbitrary: true,
    supportsNegative: false,
  },
  {
    id: 'margin',
    category: 'Spacing',
    subcategory: 'Margin',
    prefixes: ['m', 'mx', 'my', 'mt', 'mr', 'mb', 'ml'],
    cssProperties: {
      m: ['margin'],
      mx: ['margin-left', 'margin-right'],
      my: ['margin-top', 'margin-bottom'],
      mt: ['margin-top'],
      mr: ['margin-right'],
      mb: ['margin-bottom'],
      ml: ['margin-left'],
    },
    themeKey: 'spacing',
    type: 'scale',
    supportsArbitrary: true,
    supportsNegative: true,
  },
  {
    id: 'gap',
    category: 'Spacing',
    subcategory: 'Gap',
    prefixes: ['gap', 'gap-x', 'gap-y'],
    cssProperties: {
      gap: ['gap'],
      'gap-x': ['column-gap'],
      'gap-y': ['row-gap'],
    },
    themeKey: 'spacing',
    type: 'scale',
    supportsArbitrary: true,
    supportsNegative: false,
  },
]
