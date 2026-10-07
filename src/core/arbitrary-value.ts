/**
 * Convention Tailwind pour les valeurs arbitraires : une classe ne peut pas contenir d'espace,
 * donc `_` représente un espace (`grid-cols-[1fr_2fr]` -> `1fr 2fr`), `\_` un vrai underscore,
 * et les underscores d'une `url(...)` sont conservés tels quels (chemins de fichiers).
 */
export function decodeArbitraryValue(raw: string): string {
  return raw
    .split(/(url\([^)]*\))/)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(/\\_|_/g, (m) => (m === '_' ? ' ' : '_'))))
    .join('')
}

/** Retire une paire de guillemets englobante (`"open"` -> `open`), sinon renvoie tel quel. */
export function unquote(value: string): string {
  const m = /^(['"])(.*)\1$/.exec(value)
  return m ? m[2] : value
}
