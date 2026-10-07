import { joinVariants } from '../../core/split-variants'
import { translateCategory, translateSubcategory } from '../i18n'
import { useT } from '../i18n/useT'
import { useDevPanelStore } from '../store/useDevPanelStore'
import type { SearchResult } from '../search'
import type { GeneratedClass } from '../../types'

interface SearchResultsProps {
  query: string
  result: SearchResult
  activeClasses: string[]
  variants: string[]
  onApply: (item: GeneratedClass) => void
}

/** Résultats de la recherche globale, déjà classés (cf. search.ts). */
export default function SearchResults({ query, result, activeClasses, variants, onApply }: SearchResultsProps) {
  const t = useT()
  const language = useDevPanelStore((s) => s.language)

  if (result.total === 0) return <p className="devwind-empty">{t('search.none', { query: query.trim() })}</p>

  return (
    <div className="devwind-search-results">
      {result.fuzzy && <p className="devwind-search-results__hint">{t('search.fuzzy')}</p>}
      <div className="devwind-value-grid">
        {result.items.map((item) => {
          const active = activeClasses.includes(joinVariants(variants, item.className))
          const where = `${translateCategory(item.category, language)}${item.subcategory ? ` / ${translateSubcategory(item.subcategory, language)}` : ''}`
          return (
            <button
              key={item.className}
              type="button"
              className={`devwind-value${active ? ' devwind-value--active' : ''}${item.category === 'Couleurs' ? ' devwind-value--color' : ''}`}
              aria-pressed={active}
              title={item.themeToken ? `${where} — ${item.negative ? '-' : ''}${item.themeToken}` : where}
              onClick={() => onApply(item)}
            >
              {item.category === 'Couleurs' && (
                <span className="devwind-value__swatch" aria-hidden="true" style={{ background: item.themeToken ?? undefined }} />
              )}
              <span className="devwind-value__label">{item.className}</span>
            </button>
          )
        })}
      </div>
      {result.total > result.items.length && (
        <p className="devwind-search-results__more">{t('search.more', { count: result.total - result.items.length })}</p>
      )}
    </div>
  )
}
