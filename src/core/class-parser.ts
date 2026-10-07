import { taxonomy } from '../data/taxonomy'
import { classes } from '../data/classes'
import { splitVariants } from './split-variants'
import type { TaxonomyEntry } from '../types'

/**
 * Classes réellement générées (cf. scripts/generate-tailwind-data.ts), regroupées par entrée
 * de taxonomie : sert de source de vérité pour valider qu'un candidat "préfixe + suffixe" est
 * une vraie classe Tailwind POUR CETTE ENTRÉE PRÉCISE. Le regroupement par entrée (plutôt qu'un
 * seul Set global) est nécessaire : `text-xl` est une classe valide de fontSize, mais si on
 * testait juste "cette chaîne existe-t-elle quelque part dans le dataset", elle validerait à
 * tort un candidat textColor également (les deux entrées partagent le préfixe `text`).
 */
const VALID_CLASS_NAMES_BY_ENTRY = new Map<string, Set<string>>()
for (const c of classes) {
  const set = VALID_CLASS_NAMES_BY_ENTRY.get(c.taxonomyId) ?? new Set<string>()
  set.add(c.className)
  VALID_CLASS_NAMES_BY_ENTRY.set(c.taxonomyId, set)
}

export { splitVariants }

export interface ClassMatch {
  entry: TaxonomyEntry
  prefix: string
  /** valeur après le préfixe (clé de thème, ou contenu de `[...]` si arbitraire) */
  suffix: string
  isArbitrary: boolean
  isNegative: boolean
}

function toClassName(prefix: string, suffix: string, isNegative: boolean): string {
  const base = prefix === '' ? suffix : suffix === '' ? prefix : `${prefix}-${suffix}`
  return isNegative ? `-${base}` : base
}

function firstSegment(s: string): string {
  const dash = s.indexOf('-')
  return dash === -1 ? s : s.slice(0, dash)
}

interface TaxonomyIndex {
  /** Classe static -> correspondance (première dans l'ordre entrées × préfixes × valeurs). */
  statics: Map<string, ClassMatch>
  /** Couples (entrée non static, préfixe) groupés par premier segment du préfixe, dans l'ordre
   * de la taxonomie. Un candidat ne peut matcher que si la classe est `préfixe` ou commence par
   * `préfixe-` : les deux partagent alors forcément ce premier segment. */
  dynamicBySegment: Map<string, { entry: TaxonomyEntry; prefix: string }[]>
}

function buildIndex(entries: TaxonomyEntry[]): TaxonomyIndex {
  const statics = new Map<string, ClassMatch>()
  const dynamicBySegment = new Map<string, { entry: TaxonomyEntry; prefix: string }[]>()
  for (const entry of entries) {
    for (const prefix of entry.prefixes) {
      if (entry.type === 'static') {
        for (const value of entry.staticValues ?? []) {
          const cls = prefix === '' ? value : `${prefix}-${value}`
          if (!statics.has(cls)) statics.set(cls, { entry, prefix, suffix: value, isArbitrary: false, isNegative: false })
        }
      } else if (prefix !== '') {
        const segment = firstSegment(prefix)
        const bucket = dynamicBySegment.get(segment) ?? []
        bucket.push({ entry, prefix })
        dynamicBySegment.set(segment, bucket)
      }
    }
  }
  return { statics, dynamicBySegment }
}

const defaultIndex = buildIndex(taxonomy)

/**
 * Fait correspondre une classe "base" (sans variants) à son entrée de taxonomie.
 * Les entrées `static` sont testées avant les entrées `scale`/`color` (ex. `text-left`
 * doit matcher `textAlign`, pas `fontSize`). Pour les entrées `scale`/`color`, un candidat
 * "préfixe + suffixe" n'est retenu que s'il correspond à une classe réellement générée
 * (VALID_CLASS_NAMES) : ça désambiguïse naturellement les préfixes partagés (`text-red-500`
 * -> textColor, `text-xl` -> fontSize) et évite de confondre une classe custom qui partage
 * un préfixe par coïncidence (`my-custom-btn`) avec une vraie classe Tailwind.
 */
export function matchTaxonomy(base: string, entries: TaxonomyEntry[] = taxonomy): ClassMatch | null {
  const index = entries === taxonomy ? defaultIndex : buildIndex(entries)
  const isNegative = base.startsWith('-')
  const working = isNegative ? base.slice(1) : base

  if (!isNegative) {
    const staticMatch = index.statics.get(working)
    if (staticMatch) return staticMatch
  }

  for (const { entry, prefix } of index.dynamicBySegment.get(firstSegment(working)) ?? []) {
    if (isNegative && !entry.supportsNegative) continue
    const validNames = VALID_CLASS_NAMES_BY_ENTRY.get(entry.id)

    // Forme nue (clé de thème `DEFAULT`, ex. `rounded`/`shadow`/`border`/`ring`) : la classe
    // est le préfixe seul, sans tiret-suffixe.
    if (!isNegative && working === prefix && validNames?.has(toClassName(prefix, '', false))) {
      return { entry, prefix, suffix: '', isArbitrary: false, isNegative: false }
    }

    const dashPrefix = `${prefix}-`
    if (!working.startsWith(dashPrefix)) continue
    const suffix = working.slice(dashPrefix.length)
    if (!suffix) continue

    // Le `/NN` optionnel gère les valeurs arbitraires avec modificateur d'opacité
    // (`bg-[#ff0000]/50`) : sans lui, ce candidat ne matcherait aucune entrée (le dataset
    // généré ne contient que les classes sans opacité) et le diff ne retirerait jamais
    // l'ancienne classe arbitraire au profit de la nouvelle (pas le même "slot").
    const arbitraryMatch = /^\[(.+)\](?:\/(\d{1,3}))?$/.exec(suffix)
    if (arbitraryMatch) {
      if (!entry.supportsArbitrary) continue
      const fullSuffix = arbitraryMatch[1] + (arbitraryMatch[2] ? `/${arbitraryMatch[2]}` : '')
      return { entry, prefix, suffix: fullSuffix, isArbitrary: true, isNegative }
    }

    if (validNames?.has(toClassName(prefix, suffix, isNegative))) {
      return { entry, prefix, suffix, isArbitrary: false, isNegative }
    }

    // Modificateur d'opacité (`bg-red-500/80`) : le dataset généré ne contient que les
    // classes de base sans `/NN`, donc on retente sans ce suffixe avant de conclure à
    // "non reconnu" — sinon une classe couleur avec opacité n'est jamais reconnue comme
    // "même slot" par le diff, et l'ancienne classe n'est jamais retirée au clic.
    if (entry.type === 'color') {
      const opacityMatch = /^(.+)\/\d{1,3}$/.exec(suffix)
      if (opacityMatch && validNames?.has(toClassName(prefix, opacityMatch[1], isNegative))) {
        return { entry, prefix, suffix, isArbitrary: false, isNegative }
      }
    }
  }

  return null
}

/** Classe (avec variants éventuels) dont la base est reconnue comme utilitaire Tailwind. */
export function isTailwindClass(className: string): boolean {
  return matchTaxonomy(splitVariants(className).base) !== null
}
