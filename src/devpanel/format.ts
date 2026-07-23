import type { GeneratedClass } from '../types'

/** Suffixe affichable d'une classe générée (ex. `bg-red-500` -> `red-500`), « défaut » pour
 * les clés de thème `DEFAULT` (classe nue, ex. `rounded`/`shadow`/`border`/`ring`). */
export function formatSuffix(item: GeneratedClass): string {
  const withoutSign = item.negative ? item.className.slice(1) : item.className
  const suffix = item.prefix ? withoutSign.slice(item.prefix.length + 1) : withoutSign
  if (!suffix) return 'défaut'
  return item.negative ? `-${suffix}` : suffix
}
