// Script de build : croise le thème par défaut Tailwind v3 (API publique et stable) avec la
// taxonomie hand-authored (src/data/taxonomy.ts) pour produire le dataset des classes
// utilitaires, SANS jamais taper une classe à la main.
// Sortie versionnée : src/data/generated/tailwind-classes.json (bundlée par Vite, pas de
// fetch runtime).
//
// `resolveConfig` résout le thème par défaut v3 (config JS, moteur PostCSS) — contrairement à
// v4 qui l'a retiré au profit d'un moteur natif/Rust piloté par CSS (`@theme`). Couleurs par
// défaut en hex (`#ef4444`), pas en OKLCH comme en v4 : aucun changement de code nécessaire
// ailleurs, `getComputedStyle`/canvas gèrent déjà n'importe quelle syntaxe de couleur.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import resolveConfig from 'tailwindcss/resolveConfig'
import { taxonomy } from '../src/data/taxonomy'
import type { GeneratedClass, SlimGeneratedClass, TaxonomyEntry } from '../src/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const { theme } = resolveConfig({ content: [] }) as { theme: Record<string, unknown> }

function className(prefix: string, key: string): string {
  if (prefix === '') return key
  if (key === '') return prefix
  return `${prefix}-${key}`
}

interface FlatEntry {
  key: string
  value: string
  secondary: string | null
}

/** Aplati un objet de thème imbriqué (couleurs) en paires { suffixe de classe, valeur }. */
function flattenThemeScale(scale: unknown, prefix = ''): FlatEntry[] {
  if (typeof scale === 'string') return [{ key: prefix, value: scale, secondary: null }]
  if (typeof scale !== 'object' || scale === null) return []
  const out: FlatEntry[] = []
  for (const [k, v] of Object.entries(scale as Record<string, unknown>)) {
    if (k === '__CSS_VALUES__') continue
    const nextKey = k === 'DEFAULT' ? prefix : prefix ? `${prefix}-${k}` : k
    if (typeof v === 'string') {
      out.push({ key: nextKey, value: v, secondary: null })
    } else if (typeof v === 'object' && v !== null) {
      out.push(...flattenThemeScale(v, nextKey))
    }
  }
  return out
}

/** Pour fontSize : valeur = string, ou [taille, {lineHeight}] / [taille, lineHeight]. */
function stringifyThemeValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return String(value[0])
  return JSON.stringify(value)
}

/** Pour fontSize uniquement : extrait le line-height apparié `[taille, {lineHeight}]`,
 * sinon `null`. Générique (pas de branchement spécifique fontSize dans entriesForTaxonomy) :
 * ne renvoie une valeur que si la forme du thème s'y prête. */
function stringifySecondaryValue(value: unknown): string | null {
  if (Array.isArray(value) && typeof value[1] === 'object' && value[1] !== null && 'lineHeight' in (value[1] as object)) {
    return String((value[1] as { lineHeight: unknown }).lineHeight)
  }
  return null
}

function entriesForTaxonomy(entry: TaxonomyEntry): GeneratedClass[] {
  const out: GeneratedClass[] = []

  if (entry.type === 'static') {
    for (const value of entry.staticValues ?? []) {
      for (const prefix of entry.prefixes) {
        out.push({
          className: className(prefix, value),
          taxonomyId: entry.id,
          prefix,
          category: entry.category,
          subcategory: entry.subcategory,
          themeKey: null,
          themeToken: null,
          secondaryValue: null,
          negative: false,
        })
      }
    }
    return out
  }

  if (!entry.themeKey) return out
  const scale = theme[entry.themeKey]
  const flat = entry.type === 'color' ? flattenThemeScale(scale) : flattenScaleFlat(scale)

  for (const { key, value, secondary } of flat) {
    for (const prefix of entry.prefixes) {
      out.push({
        className: className(prefix, key),
        taxonomyId: entry.id,
        prefix,
        category: entry.category,
        subcategory: entry.subcategory,
        themeKey: entry.themeKey,
        themeToken: stringifyThemeValue(value),
        secondaryValue: secondary,
        negative: false,
      })
      if (entry.supportsNegative && /^[0-9.]/.test(key)) {
        out.push({
          className: `-${className(prefix, key)}`,
          taxonomyId: entry.id,
          prefix,
          category: entry.category,
          subcategory: entry.subcategory,
          themeKey: entry.themeKey,
          themeToken: stringifyThemeValue(value),
          secondaryValue: secondary,
          negative: true,
        })
      }
    }
  }
  return out
}

/** Pour les échelles non-couleur (spacing, fontSize, fontWeight...) : un seul niveau, pas de
 * nesting. `DEFAULT` -> clé '' (classe nue, ex. `rounded`/`shadow`/`border`/`ring`), comme le
 * fait déjà `flattenThemeScale` pour les couleurs — sinon on génère `rounded-DEFAULT` au lieu
 * de `rounded`, et la vraie classe nue n'est jamais produite. */
function flattenScaleFlat(scale: unknown): FlatEntry[] {
  if (typeof scale !== 'object' || scale === null) return []
  return Object.entries(scale as Record<string, unknown>).map(([key, value]) => ({
    key: key === 'DEFAULT' ? '' : key,
    value: stringifyThemeValue(value),
    secondary: stringifySecondaryValue(value),
  }))
}

const generated: GeneratedClass[] = taxonomy.flatMap(entriesForTaxonomy)

const outDir = path.resolve(__dirname, '../src/data/generated')
fs.mkdirSync(outDir, { recursive: true })

const outFile = path.join(outDir, 'tailwind-classes.json')
fs.writeFileSync(outFile, JSON.stringify(generated, null, 2))

// Version allégée pour le content script (class-parser.ts, live-style.ts) : `category`/
// `subcategory` ne servent qu'à l'affichage/regroupement dans le devpanel (src/devpanel/data.ts,
// PropertyRow.tsx...), jamais à la reconnaissance ou à la synthèse de classes — inutile de les
// embarquer dans le bundle injecté sur chaque page (~22% de réduction sur ce fichier).
const slim: SlimGeneratedClass[] = generated.map(({ className, taxonomyId, prefix, themeKey, themeToken, secondaryValue, negative }) => ({
  className,
  taxonomyId,
  prefix,
  themeKey,
  themeToken,
  secondaryValue,
  negative,
}))
const slimOutFile = path.join(outDir, 'tailwind-classes-slim.json')
fs.writeFileSync(slimOutFile, JSON.stringify(slim))

console.log(`[generate-tailwind-data] ${generated.length} classes générées -> ${path.relative(process.cwd(), outFile)} (+ version allégée pour le content script)`)
