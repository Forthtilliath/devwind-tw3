import type { TaxonomyEntry } from '../../types'

/** Couleurs : fond, texte, bordure, ring, séparateurs. */
export const colors: TaxonomyEntry[] = [
  {
    id: 'backgroundColor',
    category: 'Couleurs',
    subcategory: 'Background',
    prefixes: ['bg'],
    cssProperties: { bg: ['background-color'] },
    themeKey: 'colors',
    type: 'color',
    supportsArbitrary: true,
    supportsNegative: false,
  },
  {
    id: 'textColor',
    category: 'Couleurs',
    subcategory: 'Texte',
    prefixes: ['text'],
    cssProperties: { text: ['color'] },
    themeKey: 'colors',
    type: 'color',
    supportsArbitrary: true,
    supportsNegative: false,
  },
  {
    id: 'borderColor',
    category: 'Couleurs',
    subcategory: 'Border',
    prefixes: ['border', 'border-t', 'border-r', 'border-b', 'border-l', 'border-x', 'border-y'],
    cssProperties: {
      border: ['border-color'],
      'border-t': ['border-top-color'],
      'border-r': ['border-right-color'],
      'border-b': ['border-bottom-color'],
      'border-l': ['border-left-color'],
      'border-x': ['border-left-color', 'border-right-color'],
      'border-y': ['border-top-color', 'border-bottom-color'],
    },
    themeKey: 'colors',
    type: 'color',
    supportsArbitrary: true,
    supportsNegative: false,
  },
  {
    id: 'ringColor',
    category: 'Couleurs',
    subcategory: 'Ring',
    prefixes: ['ring'],
    // Approximation simple (voir live-style.ts) : pas composé avec --tw-ring-shadow.
    cssProperties: { ring: ['box-shadow'] },
    themeKey: 'colors',
    type: 'color',
    supportsArbitrary: true,
    supportsNegative: false,
  },
  {
    id: 'divideColor',
    category: 'Couleurs',
    subcategory: 'Divide',
    prefixes: ['divide'],
    // S'applique aux enfants (`> * + *`), pas à l'élément lui-même : pas de synthèse live
    // possible avec le modèle actuel (cssProperties vide -> declarationsFor renvoie null).
    cssProperties: {},
    themeKey: 'colors',
    type: 'color',
    supportsArbitrary: false,
    supportsNegative: false,
  },
]
