import type { GeneratedClass } from '../types'

/** Suffixe affichable d'une classe générée (ex. `bg-red-500` -> `red-500`), `defaultLabel`
 * (« défaut », traduit par l'appelant) pour les clés de thème `DEFAULT` (classe nue, ex.
 * `rounded`/`shadow`/`border`/`ring`). */
export function formatSuffix(item: GeneratedClass, defaultLabel: string): string {
  const withoutSign = item.negative ? item.className.slice(1) : item.className
  const suffix = item.prefix ? withoutSign.slice(item.prefix.length + 1) : withoutSign
  if (!suffix) return defaultLabel
  return item.negative ? `-${suffix}` : suffix
}
