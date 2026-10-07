import type { TaxonomyEntry } from '../../types'

/** Mise en page : display, position. */
export const layout: TaxonomyEntry[] = [
  {
    id: 'display',
    category: 'Layout',
    subcategory: 'Display',
    prefixes: [''],
    cssProperties: { '': ['display'] },
    themeKey: null,
    type: 'static',
    staticValues: [
      'block',
      'inline-block',
      'inline',
      'flex',
      'inline-flex',
      'grid',
      'inline-grid',
      'table',
      'hidden',
    ],
    supportsArbitrary: false,
    supportsNegative: false,
  },
  {
    id: 'position',
    category: 'Layout',
    subcategory: 'Position',
    prefixes: [''],
    cssProperties: { '': ['position'] },
    themeKey: null,
    type: 'static',
    staticValues: ['static', 'fixed', 'absolute', 'relative', 'sticky'],
    supportsArbitrary: false,
    supportsNegative: false,
  },
]
