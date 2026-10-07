function parseAlphaToken(token: string): number {
  const value = parseFloat(token)
  if (!Number.isFinite(value)) return 1
  const alpha = token.trim().endsWith('%') ? value / 100 : value
  return Math.min(1, Math.max(0, alpha))
}

/** Canal alpha (0-1) d'une couleur CSS telle que sérialisée par `getComputedStyle` :
 * `rgba(r, g, b, a)` (syntaxe à virgules) ou `oklch(L C H / a)`, `color(srgb … / a)`… (syntaxe
 * moderne). Sans alpha explicite, la couleur est opaque. Pur, sans DOM : utilisable côté content
 * script pour savoir où s'arrêter en remontant les fonds des ancêtres. */
export function colorAlpha(color: string): number {
  const c = color.trim().toLowerCase()
  if (c === 'transparent') return 0
  const slash = /\/\s*([\d.]+%?)\s*\)\s*$/.exec(c)
  if (slash) return parseAlphaToken(slash[1])
  const legacy = /^(?:rgba?|hsla?)\(([^)]*)\)$/.exec(c)
  if (legacy) {
    const parts = legacy[1].split(',')
    if (parts.length === 4) return parseAlphaToken(parts[3])
  }
  return 1
}
