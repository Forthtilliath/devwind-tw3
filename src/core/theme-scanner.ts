import type { ThemeVariable } from '../types'

/** Espaces de noms des variables de thème Tailwind v4 (générées par `@theme` à `:root`/`:host`,
 * vérifié avec `@tailwindcss/cli`) — sert à filtrer le bruit des innombrables autres custom
 * properties qu'un site peut définir sans rapport avec Tailwind. `--spacing` est un nom exact
 * (multiplicateur unique), pas un espace de noms préfixé. */
const THEME_VAR_NAMESPACES = [
  '--color-',
  '--radius-',
  '--shadow-',
  '--inset-shadow-',
  '--inset-ring-',
  '--ring-',
  '--drop-shadow-',
  '--blur-',
  '--perspective-',
  '--aspect-',
  '--text-',
  '--font-weight-',
  '--font-',
  '--tracking-',
  '--leading-',
  '--breakpoint-',
  '--container-',
  '--ease-',
  '--animate-',
]

/**
 * Liste les variables de thème Tailwind v4 réellement définies sur `:root` (vraies valeurs du
 * site, pas notre thème par défaut bundlé) — utile pour vérifier ce que le site personnalise.
 * `getComputedStyle` sur `documentElement` est indexable comme un tableau, ses entrées couvrant
 * aussi les custom properties : pas besoin de parser les feuilles de style pour les trouver.
 *
 * `sitePrefix` (option `prefix` de Tailwind v4, cf. `detectSitePrefix`) : si détecté, les noms
 * de variables du site sont eux-mêmes préfixés (`--tw-color-red-500` au lieu de
 * `--color-red-500`, vérifié avec `@tailwindcss/cli --prefix`) — sans ce paramètre, aucune
 * variable ne matcherait jamais sur un site préfixé.
 */
export function scanThemeVariables(doc: Document = document, sitePrefix: string | null = null): ThemeVariable[] {
  const namespaces = sitePrefix ? THEME_VAR_NAMESPACES.map((ns) => `--${sitePrefix}-${ns.slice(2)}`) : THEME_VAR_NAMESPACES
  const spacingName = sitePrefix ? `--${sitePrefix}-spacing` : '--spacing'

  const style = getComputedStyle(doc.documentElement)
  const out: ThemeVariable[] = []
  for (let i = 0; i < style.length; i++) {
    const name = style[i]
    if (!name.startsWith('--')) continue
    const isThemeVar = name === spacingName || namespaces.some((ns) => name.startsWith(ns))
    if (!isThemeVar) continue
    const value = style.getPropertyValue(name).trim()
    if (value) out.push({ name, value })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}
