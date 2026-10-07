// --- Propriétés composites (transform / filter / backdrop-filter) ---
//
// Tailwind combine plusieurs classes indépendantes sur une même propriété via des variables CSS
// partagées (ex. `scale-105` et `rotate-45` doivent toutes les deux affecter `transform` sans
// s'écraser). Chaque classe composite pose SA variable ET réaffirme la formule complète de la
// propriété partagée — exactement le CSS que Tailwind génère lui-même, ce qui permet à
// n'importe quelle combinaison de classes de fonctionner par cascade. Fallback (`var(--x,
// defaut)`) dans chaque référence pour rester correct même sur un site sans preflight Tailwind.
// v3 (contrairement à v4) : `scale`/`rotate`/`translate`/`skew` sont TOUS composés via la même
// propriété `transform` unique (pas de propriétés `scale`/`rotate`/`translate` natives séparées).
function transformFormula(): string {
  return (
    'translate(var(--tw-translate-x, 0), var(--tw-translate-y, 0)) ' +
    'rotate(var(--tw-rotate, 0)) skewX(var(--tw-skew-x, 0)) skewY(var(--tw-skew-y, 0)) ' +
    'scaleX(var(--tw-scale-x, 1)) scaleY(var(--tw-scale-y, 1))'
  )
}

const FILTER_VARS = ['--tw-blur', '--tw-brightness', '--tw-contrast', '--tw-grayscale', '--tw-hue-rotate', '--tw-invert', '--tw-saturate', '--tw-sepia', '--tw-drop-shadow']
function filterFormula(): string {
  return FILTER_VARS.map((v) => `var(${v},)`).join(' ')
}

const BACKDROP_FILTER_VARS = ['--tw-backdrop-blur', '--tw-backdrop-brightness', '--tw-backdrop-contrast', '--tw-backdrop-grayscale', '--tw-backdrop-hue-rotate', '--tw-backdrop-invert', '--tw-backdrop-opacity', '--tw-backdrop-saturate', '--tw-backdrop-sepia']
function backdropFilterFormula(): string {
  return BACKDROP_FILTER_VARS.map((v) => `var(${v},)`).join(' ')
}

export interface CompositeSpec {
  /** Variables CSS que CE préfixe pose (2 pour `scale` bare : scale-x ET scale-y). */
  cssVars: string[]
  /** Enrobe la valeur dans la fonction attendue (`blur(4px)`), ou identité si la formule
   * partagée l'enrobe déjà (`transform` : `rotate(var(--tw-rotate))`...). */
  wrap: (value: string) => string
  property: string
  formula: () => string
}

export const COMPOSITE_BY_PREFIX: Record<string, CompositeSpec> = {
  scale: { cssVars: ['--tw-scale-x', '--tw-scale-y'], wrap: (v) => v, property: 'transform', formula: transformFormula },
  'scale-x': { cssVars: ['--tw-scale-x'], wrap: (v) => v, property: 'transform', formula: transformFormula },
  'scale-y': { cssVars: ['--tw-scale-y'], wrap: (v) => v, property: 'transform', formula: transformFormula },
  rotate: { cssVars: ['--tw-rotate'], wrap: (v) => v, property: 'transform', formula: transformFormula },
  'translate-x': { cssVars: ['--tw-translate-x'], wrap: (v) => v, property: 'transform', formula: transformFormula },
  'translate-y': { cssVars: ['--tw-translate-y'], wrap: (v) => v, property: 'transform', formula: transformFormula },
  'skew-x': { cssVars: ['--tw-skew-x'], wrap: (v) => v, property: 'transform', formula: transformFormula },
  'skew-y': { cssVars: ['--tw-skew-y'], wrap: (v) => v, property: 'transform', formula: transformFormula },

  blur: { cssVars: ['--tw-blur'], wrap: (v) => (v ? `blur(${v})` : ''), property: 'filter', formula: filterFormula },
  brightness: { cssVars: ['--tw-brightness'], wrap: (v) => `brightness(${v})`, property: 'filter', formula: filterFormula },
  contrast: { cssVars: ['--tw-contrast'], wrap: (v) => `contrast(${v})`, property: 'filter', formula: filterFormula },
  grayscale: { cssVars: ['--tw-grayscale'], wrap: (v) => `grayscale(${v})`, property: 'filter', formula: filterFormula },
  'hue-rotate': { cssVars: ['--tw-hue-rotate'], wrap: (v) => `hue-rotate(${v})`, property: 'filter', formula: filterFormula },
  invert: { cssVars: ['--tw-invert'], wrap: (v) => `invert(${v})`, property: 'filter', formula: filterFormula },
  saturate: { cssVars: ['--tw-saturate'], wrap: (v) => `saturate(${v})`, property: 'filter', formula: filterFormula },
  sepia: { cssVars: ['--tw-sepia'], wrap: (v) => `sepia(${v})`, property: 'filter', formula: filterFormula },

  'backdrop-blur': { cssVars: ['--tw-backdrop-blur'], wrap: (v) => (v ? `blur(${v})` : ''), property: 'backdrop-filter', formula: backdropFilterFormula },
  'backdrop-brightness': { cssVars: ['--tw-backdrop-brightness'], wrap: (v) => `brightness(${v})`, property: 'backdrop-filter', formula: backdropFilterFormula },
  'backdrop-contrast': { cssVars: ['--tw-backdrop-contrast'], wrap: (v) => `contrast(${v})`, property: 'backdrop-filter', formula: backdropFilterFormula },
  'backdrop-grayscale': { cssVars: ['--tw-backdrop-grayscale'], wrap: (v) => `grayscale(${v})`, property: 'backdrop-filter', formula: backdropFilterFormula },
  'backdrop-hue-rotate': { cssVars: ['--tw-backdrop-hue-rotate'], wrap: (v) => `hue-rotate(${v})`, property: 'backdrop-filter', formula: backdropFilterFormula },
  'backdrop-invert': { cssVars: ['--tw-backdrop-invert'], wrap: (v) => `invert(${v})`, property: 'backdrop-filter', formula: backdropFilterFormula },
  'backdrop-opacity': { cssVars: ['--tw-backdrop-opacity'], wrap: (v) => `opacity(${v})`, property: 'backdrop-filter', formula: backdropFilterFormula },
  'backdrop-saturate': { cssVars: ['--tw-backdrop-saturate'], wrap: (v) => `saturate(${v})`, property: 'backdrop-filter', formula: backdropFilterFormula },
  'backdrop-sepia': { cssVars: ['--tw-backdrop-sepia'], wrap: (v) => `sepia(${v})`, property: 'backdrop-filter', formula: backdropFilterFormula },
}

export function compositeDeclarations(spec: CompositeSpec, value: string): string[] {
  const varDecls = spec.cssVars.map((v) => `${v}: ${spec.wrap(value)}`)
  // -webkit-backdrop-filter en plus (comme le CSS réel de Tailwind) : coût nul, meilleure fidélité.
  const propDecls = spec.property === 'backdrop-filter' ? [`-webkit-backdrop-filter: ${spec.formula()}`, `${spec.property}: ${spec.formula()}`] : [`${spec.property}: ${spec.formula()}`]
  return [...varDecls, ...propDecls]
}
