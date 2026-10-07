import { classes } from '../data/classes'
import type { GeneratedClass } from '../types'

// Recherche globale du panneau : résultats classés (exact > commence par > début de segment >
// contient > valeur CSS > catégorie), recherche par valeur (`16px` → `p-4`, `text-base`…) et,
// faute de résultat exact, suggestions tolérantes aux fautes de frappe.

export const SEARCH_LIMIT = 60

export interface SearchResult {
  items: GeneratedClass[]
  /** Nombre total de résultats (au-delà de `SEARCH_LIMIT`, seuls les premiers sont rendus). */
  total: number
  /** Aucun résultat exact : `items` sont des suggestions approchées. */
  fuzzy: boolean
}

const EMPTY: SearchResult = { items: [], total: 0, fuzzy: false }

const NAMES = classes.map((c) => c.className.toLowerCase())
// Champs séparés par `\n`, qu'une saisie dans un champ texte ne peut pas contenir : une requête ne
// peut donc pas matcher à cheval sur deux champs.
const CATEGORY_TEXT = classes.map((c) => `${c.category}\n${c.subcategory ?? ''}`.toLowerCase())

const NUMERIC_RE = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(px|rem|em|%|ms|s|deg|turn)?$/

/** Forme canonique d'une valeur CSS simple, pour comparer `16px` et `1rem`, `0.15s` et `150ms`.
 * `null` si ce n'est pas un nombre (avec unité éventuelle). */
export function canonicalValue(raw: string): string | null {
  const m = NUMERIC_RE.exec(raw.trim().toLowerCase())
  if (!m) return null
  let value = Number(m[1])
  let unit = m[2] ?? ''
  if (unit === 'px') {
    value /= 16
    unit = 'rem'
  } else if (unit === 's') {
    value *= 1000
    unit = 'ms'
  }
  return `${Math.round(value * 10000) / 10000}${unit}`
}

const VALUES = classes.map((c) => {
  if (!c.themeToken) return null
  const token = c.negative ? `-${c.themeToken}` : c.themeToken
  return { canonical: canonicalValue(token), text: token.toLowerCase() }
})

/** Distance d'édition avec transpositions (`itmes` → `items` = 1), abandonnée au-delà de `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev2: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2] + 1)
      row.push(d)
      rowMin = Math.min(rowMin, d)
    }
    if (rowMin > max) return max + 1
    prev2 = prev
    prev = row
  }
  return prev[b.length]
}

function rank(name: string, q: string): number {
  if (name === q) return 0
  if (name.startsWith(q)) return 1
  const at = name.indexOf(q)
  if (at === -1) return -1
  return name[at - 1] === '-' || name[at - 1] === ':' ? 2 : 3
}

function finish(scored: { index: number; score: number }[], limit: number, fuzzy: boolean): SearchResult {
  // Tri stable : à score égal, l'ordre du dataset (celui de la taxonomie) est conservé.
  scored.sort((a, b) => a.score - b.score)
  return { items: scored.slice(0, limit).map((s) => classes[s.index]), total: scored.length, fuzzy }
}

export function searchClasses(query: string, limit = SEARCH_LIMIT): SearchResult {
  const q = query.trim().toLowerCase()
  if (!q) return EMPTY
  const valueQuery = canonicalValue(q)

  const scored: { index: number; score: number }[] = []
  for (let i = 0; i < NAMES.length; i++) {
    const r = rank(NAMES[i], q)
    if (r !== -1) {
      scored.push({ index: i, score: r })
      continue
    }
    const value = VALUES[i]
    if (value && (value.text === q || (valueQuery !== null && value.canonical === valueQuery))) {
      scored.push({ index: i, score: 4 })
      continue
    }
    if (CATEGORY_TEXT[i].includes(q)) scored.push({ index: i, score: 5 })
  }
  if (scored.length > 0 || q.length < 3) return finish(scored, limit, false)

  // Rien d'exact : classes proches du texte saisi, entier ou en début de nom (frappe en cours).
  const max = q.length <= 4 ? 1 : 2
  const fuzzy: { index: number; score: number }[] = []
  for (let i = 0; i < NAMES.length; i++) {
    const name = NAMES[i]
    const whole = editDistance(q, name, max)
    const start = name.length > q.length ? editDistance(q, name.slice(0, q.length), max) : whole
    const d = Math.min(whole, start)
    if (d <= max) fuzzy.push({ index: i, score: d * 2 + (whole <= start ? 0 : 1) })
  }
  return finish(fuzzy, limit, true)
}
