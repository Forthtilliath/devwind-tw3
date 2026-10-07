import type { TaxonomyEntry } from '../../types'
import { spacing } from './spacing'
import { sizing } from './sizing'
import { colors } from './colors'
import { typography } from './typography'
import { layout } from './layout'
import { borders } from './borders'
import { effects } from './effects'
import { filters } from './filters'
import { transitions } from './transitions'
import { interactivity } from './interactivity'

/**
 * Table hand-authored : une entrée par "plugin" Tailwind, un fichier par catégorie du panneau.
 * C'est ici qu'on investit le soin sur l'organisation du panneau — pas dans la liste des classes
 * elle-même (générée, voir scripts/generate-tailwind-data.ts).
 *
 * L'ordre compte : il fixe l'ordre d'affichage des catégories, et `matchTaxonomy`
 * (core/class-parser.ts) retient la première entrée qui correspond.
 *
 * `prefixes: ['']` signifie que la classe est la valeur elle-même, sans tiret de préfixe
 * (ex. `display`: la classe `flex` est directement `flex`, pas `flex-flex`).
 *
 * `staticValueMap` (optionnel, type `static`) : traduit un suffixe de classe vers sa vraie
 * valeur CSS quand ils ne coïncident pas verbatim (ex. `resize-x` → `resize: horizontal`,
 * alors que la plupart des entrées static ont suffixe === valeur CSS, ex. `flex` → `display: flex`).
 */
export const taxonomy: TaxonomyEntry[] = [
  ...spacing,
  ...sizing,
  ...colors,
  ...typography,
  ...layout,
  ...borders,
  ...effects,
  ...filters,
  ...transitions,
  ...interactivity,
]
