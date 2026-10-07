import { ARBITRARY_ENTRY_BY_PREFIX, CLASS_BY_NAME, TAXONOMY_BY_ID } from '../data/classes'
import { splitVariants } from './split-variants'
import { decodeArbitraryValue } from './arbitrary-value'
import { COMPOSITE_BY_PREFIX, compositeDeclarations } from './composite'
import { planVariants, wrapMedia } from './variant-plan'
import { filterSupportedDeclarations } from './css-guard'
import { DEFAULT_BREAKPOINTS } from './breakpoints'
import type { BreakpointMap } from './breakpoints'
import type { LiveRule } from '../types'

// Synthèse, côté panneau, du CSS qui prévisualise une classe absente du CSS du site. La page
// (content/live-injection.ts) se contente de vérifier qu'aucune vraie règle n'existe, puis
// d'injecter ce CSS : elle n'embarque ainsi ni la taxonomie ni le dataset.

// --- Valeurs : littérales (v3 n'expose pas son thème en variables CSS runtime) ---
//
// Contrairement à v4 (qui référence de vraies variables CSS `@theme`), Tailwind v3 compile
// chaque classe avec sa valeur de thème inlinée en dur (`.bg-red-500 { background-color: #ef4444
// }`, `.p-4 { padding: 1rem }` — pas de `calc(var(--spacing) * 4)` ni de `var(--color-red-500)`).
// Pas de scan de détection de thème custom possible sans parser le CSS compilé du site (hors
// scope) : on utilise directement la valeur littérale de notre dataset généré.

/**
 * Détermine les déclarations CSS (`propriété: valeur`) d'une classe "base" (sans variants),
 * à partir de la taxonomie + du dataset généré (classes connues) ou en parsant directement
 * une valeur arbitraire (`bg-[#ff0000]`, non présente dans le dataset généré — toujours
 * littérale, comme le vrai Tailwind). Gère aussi le modificateur d'opacité (`bg-red-500/80`,
 * `bg-[#ff0000]/50`) et les propriétés composites (transform/filter/backdrop-filter, cf.
 * composite.ts).
 */
export function declarationsFor(base: string): string[] | null {
  const opacitySplit = /^(.*)\/(\d{1,3})$/.exec(base)
  const withoutOpacity = opacitySplit ? opacitySplit[1] : base
  const opacityPct = opacitySplit ? Number(opacitySplit[2]) : null

  const generated = CLASS_BY_NAME.get(withoutOpacity)
  if (generated) {
    const entry = TAXONOMY_BY_ID.get(generated.taxonomyId)
    const props = entry?.cssProperties[generated.prefix]
    if (!entry || !props) return null

    if (entry.type === 'static') {
      const suffix = generated.prefix ? withoutOpacity.slice(generated.prefix.length + 1) : withoutOpacity
      const value = entry.staticValueMap?.[suffix] ?? suffix
      return props.map((p) => `${p}: ${value}`)
    }

    if (!generated.themeToken) return null
    let value = generated.negative ? `-${generated.themeToken}` : generated.themeToken
    if (opacityPct != null && entry.type === 'color') {
      value = `color-mix(in srgb, ${value} ${opacityPct}%, transparent)`
    }

    const composite = COMPOSITE_BY_PREFIX[generated.prefix]
    if (composite) return compositeDeclarations(composite, value)

    if (entry.id === 'fontSize') {
      const decls = [`font-size: ${value}`]
      if (generated.secondaryValue) decls.push(`line-height: ${generated.secondaryValue}`)
      return decls
    }

    return props.map((p) => `${p}: ${value}`)
  }

  const arbitraryMatch = /^(-?)([a-z][a-z-]*)-\[(.+)\]$/.exec(withoutOpacity)
  if (arbitraryMatch) {
    const [, neg, prefix, rawValue] = arbitraryMatch
    const entry = ARBITRARY_ENTRY_BY_PREFIX.get(prefix)
    const props = entry?.cssProperties[prefix]
    if (!entry || !props) return null

    let value = `${neg}${decodeArbitraryValue(rawValue)}`
    if (opacityPct != null && entry.type === 'color') {
      value = `color-mix(in srgb, ${value} ${opacityPct}%, transparent)`
    }

    const composite = COMPOSITE_BY_PREFIX[prefix]
    if (composite) return compositeDeclarations(composite, value)

    return props.map((p) => `${p}: ${value}`)
  }

  return null
}

/**
 * Synthétise la règle qui donne un effet visuel à une classe Tailwind (avec variants
 * éventuels) même si le CSS de la page ne la définit pas (build de production purgé qui n'a
 * jamais utilisé cette classe) : déclarations depuis notre taxonomie + le thème par défaut,
 * avec `!important`, pour prévisualiser n'importe quelle valeur. La page n'injecte ce CSS que si
 * aucune règle réelle n'existe (on préfère toujours le vrai CSS du site, plus fidèle à son
 * thème effectif). `null` si la classe n'est pas synthétisable.
 *
 * `dark:` produit systématiquement DEUX règles (`@media (prefers-color-scheme: dark)` ET
 * `:where(.dark, .dark *)`) plutôt que de deviner la stratégie du site (fiable, sans
 * heuristique DOM) : si le site n'utilise pas Tailwind dark mode, les deux restent inertes. La
 * page les ordonne selon la stratégie active (cf. content/live-injection.ts).
 */
export function buildLiveRule(fullClassName: string, breakpoints: BreakpointMap = DEFAULT_BREAKPOINTS): LiveRule | null {
  const { variants, base } = splitVariants(fullClassName)

  // Déclarations vérifiées une à une (`CSS.supports`) : une valeur arbitraire invalide ou piégée
  // (`;`, `}`...) est écartée ici ; s'il n'en reste aucune, la classe n'aura pas d'effet.
  const decls = filterSupportedDeclarations(declarationsFor(base) ?? [])
  if (decls.length === 0) return null

  const plan = planVariants(variants, breakpoints)
  if (!plan) return null

  // CSS.escape natif : échappe TOUT ce qui est invalide dans un identifiant (`( ) , ' " ! + * =`,
  // chiffre en tête...), là où un échappement maison oubliait toujours un cas.
  const selector = `${plan.selectorPrefix}.${CSS.escape(fullClassName)}${plan.selectorSuffix}`
  const importantDecls = decls.map((d) => `${d} !important`).join('; ')

  if (!plan.hasDark) return { rules: [wrapMedia(`${selector} { ${importantDecls}; }`, plan.mediaQueries)], dark: false }

  const mediaRule = wrapMedia(`${selector} { ${importantDecls}; }`, ['(prefers-color-scheme: dark)', ...plan.mediaQueries])
  const classRule = wrapMedia(`${selector}:where(.dark, .dark *) { ${importantDecls}; }`, plan.mediaQueries)
  return { rules: [mediaRule, classRule], dark: true }
}
