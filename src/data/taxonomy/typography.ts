import type { TaxonomyEntry } from '../../types'

/** Typographie : taille, poids, alignement, espacement des lettres, interligne. */
export const typography: TaxonomyEntry[] = [
  {
    id: 'fontSize',
    category: 'Typography',
    subcategory: 'Taille',
    prefixes: ['text'],
    cssProperties: { text: ['font-size', 'line-height'] },
    themeKey: 'fontSize',
    type: 'scale',
    supportsArbitrary: true,
    supportsNegative: false,
  },
  {
    id: 'fontWeight',
    category: 'Typography',
    subcategory: 'Poids',
    prefixes: ['font'],
    cssProperties: { font: ['font-weight'] },
    themeKey: 'fontWeight',
    type: 'scale',
    supportsArbitrary: false,
    supportsNegative: false,
  },
  {
    id: 'textAlign',
    category: 'Typography',
    subcategory: 'Alignement',
    prefixes: ['text'],
    cssProperties: { text: ['text-align'] },
    themeKey: null,
    type: 'static',
    staticValues: ['left', 'center', 'right', 'justify', 'start', 'end'],
    supportsArbitrary: false,
    supportsNegative: false,
  },
  {
    id: 'letterSpacing',
    category: 'Typography',
    subcategory: 'Tracking',
    prefixes: ['tracking'],
    cssProperties: { tracking: ['letter-spacing'] },
    themeKey: 'letterSpacing',
    type: 'scale',
    supportsArbitrary: true,
    // Pas de convention `-tracking-x` : les valeurs resserrées (tighter/tight) sont déjà des
    // clés de thème nommées, pas des suffixes numériques niables.
    supportsNegative: false,
  },
  {
    id: 'lineHeight',
    category: 'Typography',
    subcategory: 'Leading',
    prefixes: ['leading'],
    cssProperties: { leading: ['line-height'] },
    themeKey: 'lineHeight',
    type: 'scale',
    supportsArbitrary: true,
    supportsNegative: false,
  },
]
