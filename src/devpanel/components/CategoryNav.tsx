import { useEffect, useState } from 'react'
import { categoryGroups } from '../data'
import { TAXONOMY_BY_ID } from '../../data/classes'
import PropertyRow from './PropertyRow'
import RailResizeHandle from './RailResizeHandle'
import { translateCategory } from '../i18n'
import { useT } from '../i18n/useT'
import { useDevPanelStore } from '../store/useDevPanelStore'
import type { GeneratedClass } from '../../types'

interface CategoryNavProps {
  activeClasses: string[]
  variants: string[]
  onApply: (item: GeneratedClass) => void
  onPreview: (item: GeneratedClass | null) => void
  onApplyArbitrary: (taxonomyId: string, prefix: string, value: string) => void
}

const RAIL_WIDTH_STORAGE_KEY = 'devwind-category-rail-width'
// Assez large pour que le plus long libellé ("Transitions & Transforms", ~142px mesuré) tienne
// sur une seule ligne par défaut, avec une petite marge pour les variations de rendu de police.
const DEFAULT_RAIL_WIDTH = 150
const MIN_RAIL_WIDTH = 72
const MAX_RAIL_WIDTH = 220

/** Rail de catégories ; le contenu de chaque catégorie est une liste de PropertyRow
 * (une ligne compacte par propriété) plutôt que des grilles exhaustives dépliées. */
export default function CategoryNav({ activeClasses, variants, onApply, onPreview, onApplyArbitrary }: CategoryNavProps) {
  const t = useT()
  const [activeCategory, setActiveCategory] = useState(categoryGroups[0]?.name ?? '')
  const [railWidth, setRailWidth] = useState(DEFAULT_RAIL_WIDTH)
  const language = useDevPanelStore((s) => s.language)
  const group = categoryGroups.find((g) => g.name === activeCategory)

  useEffect(() => {
    void chrome.storage.local.get(RAIL_WIDTH_STORAGE_KEY).then((stored) => {
      const width = stored[RAIL_WIDTH_STORAGE_KEY]
      if (typeof width === 'number' && Number.isFinite(width)) setRailWidth(Math.min(MAX_RAIL_WIDTH, Math.max(MIN_RAIL_WIDTH, width)))
    })
  }, [])

  return (
    <div className="devwind-category-nav">
      <div className="devwind-category-nav__rail" style={{ width: railWidth }}>
        {categoryGroups.map((g) => (
          <button
            key={g.name}
            type="button"
            className={`devwind-category-nav__tab${g.name === activeCategory ? ' devwind-category-nav__tab--active' : ''}`}
            aria-pressed={g.name === activeCategory}
            onClick={() => setActiveCategory(g.name)}
          >
            {translateCategory(g.name, language)}
          </button>
        ))}
      </div>
      <RailResizeHandle
        width={railWidth}
        min={MIN_RAIL_WIDTH}
        max={MAX_RAIL_WIDTH}
        defaultWidth={DEFAULT_RAIL_WIDTH}
        label={t('category.resize')}
        title={t('category.resizeTitle')}
        onResize={setRailWidth}
        onCommit={(w) => void chrome.storage.local.set({ [RAIL_WIDTH_STORAGE_KEY]: w })}
      />
      <div className="devwind-category-nav__content">
        {group?.subcategories.map((sub) => {
          const taxonomyId = sub.classes[0]?.taxonomyId
          const entry = taxonomyId ? TAXONOMY_BY_ID.get(taxonomyId) : undefined
          if (!entry) return null
          return (
            <PropertyRow
              key={sub.name}
              entry={entry}
              classes={sub.classes}
              activeClasses={activeClasses}
              variants={variants}
              onApply={onApply}
              onPreview={onPreview}
              onApplyArbitrary={(prefix, value) => onApplyArbitrary(entry.id, prefix, value)}
            />
          )
        })}
      </div>
    </div>
  )
}
