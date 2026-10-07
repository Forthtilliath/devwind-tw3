import type { ParsedClass } from '../types'

/**
 * Découpe une classe en variants + base, en respectant la profondeur de crochets
 * (une valeur arbitraire comme `bg-[url(https://x:80)]` contient un `:` qui n'est
 * pas un séparateur de variant). Module sans dépendance au dataset : utilisable aussi
 * côté content script sans y embarquer le dataset.
 */
export function splitVariants(cls: string): ParsedClass {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < cls.length; i++) {
    const c = cls[i]
    if (c === '[') depth++
    else if (c === ']') depth--
    else if (c === ':' && depth === 0) {
      parts.push(cls.slice(start, i))
      start = i + 1
    }
  }
  parts.push(cls.slice(start))
  return { raw: cls, variants: parts.slice(0, -1), base: parts[parts.length - 1] }
}

/** Inverse de `splitVariants` : `(['md', 'hover'], 'bg-red-500')` -> `md:hover:bg-red-500`. */
export function joinVariants(variants: string[], base: string): string {
  return [...variants, base].join(':')
}
