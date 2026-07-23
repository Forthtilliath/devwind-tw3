import generatedClasses from '../data/generated/tailwind-classes.json'
import type { GeneratedClass } from '../types'

const classes = generatedClasses as GeneratedClass[]

export interface SubcategoryGroup {
  name: string
  classes: GeneratedClass[]
}

export interface CategoryGroup {
  name: string
  subcategories: SubcategoryGroup[]
}

function buildCategoryGroups(items: GeneratedClass[]): CategoryGroup[] {
  const categories = new Map<string, Map<string, GeneratedClass[]>>()
  for (const item of items) {
    if (!categories.has(item.category)) categories.set(item.category, new Map())
    const subMap = categories.get(item.category)!
    const subKey = item.subcategory ?? item.category
    if (!subMap.has(subKey)) subMap.set(subKey, [])
    subMap.get(subKey)!.push(item)
  }
  return Array.from(categories.entries()).map(([name, subMap]) => ({
    name,
    subcategories: Array.from(subMap.entries()).map(([subName, subClasses]) => ({
      name: subName,
      classes: subClasses,
    })),
  }))
}

/** Ordre pensé par fréquence d'usage réelle (cf. plan section 2). */
export const CATEGORY_ORDER = [
  'Spacing',
  'Layout',
  'Sizing',
  'Typography',
  'Couleurs',
  'Bordures & Radius',
  'Effets',
  'Filtres',
  'Transitions & Transforms',
  'Interactivité',
]

export const categoryGroups: CategoryGroup[] = buildCategoryGroups(classes).sort((a, b) => {
  const ai = CATEGORY_ORDER.indexOf(a.name)
  const bi = CATEGORY_ORDER.indexOf(b.name)
  return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
})

export function searchClasses(query: string): GeneratedClass[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return classes.filter(
    (c) => c.className.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.subcategory?.toLowerCase().includes(q),
  )
}
