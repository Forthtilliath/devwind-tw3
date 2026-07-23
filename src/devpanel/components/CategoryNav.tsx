import { useEffect, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { categoryGroups } from '../data'
import { taxonomy } from '../../data/taxonomy'
import PropertyRow from './PropertyRow'
import { translateCategory } from '../i18n'
import { useDevPanelStore } from '../store/useDevPanelStore'
import type { GeneratedClass } from '../../types'

interface CategoryNavProps {
  activeClasses: string[]
  variants: string[]
  onApply: (item: GeneratedClass) => void
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
export default function CategoryNav({ activeClasses, variants, onApply, onApplyArbitrary }: CategoryNavProps) {
  const [activeCategory, setActiveCategory] = useState(categoryGroups[0]?.name ?? '')
  const [railWidth, setRailWidth] = useState(DEFAULT_RAIL_WIDTH)
  const [resizing, setResizing] = useState(false)
  const language = useDevPanelStore((s) => s.language)
  const group = categoryGroups.find((g) => g.name === activeCategory)

  useEffect(() => {
    void chrome.storage.local.get(RAIL_WIDTH_STORAGE_KEY).then((stored) => {
      const width = stored[RAIL_WIDTH_STORAGE_KEY]
      if (typeof width === 'number') setRailWidth(width)
    })
  }, [])

  function startResize(e: ReactMouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = railWidth
    setResizing(true)

    function onMouseMove(ev: MouseEvent) {
      setRailWidth(Math.min(MAX_RAIL_WIDTH, Math.max(MIN_RAIL_WIDTH, startWidth + (ev.clientX - startX))))
    }
    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      setResizing(false)
      // Lecture de la largeur la plus fraîche via l'updater fonctionnel : `railWidth` capturé à
      // la fermeture de `startResize` serait périmé après les `setRailWidth` du drag.
      setRailWidth((w) => {
        void chrome.storage.local.set({ [RAIL_WIDTH_STORAGE_KEY]: w })
        return w
      })
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div className="devwind-category-nav">
      <div className="devwind-category-nav__rail" style={{ width: railWidth }}>
        {categoryGroups.map((g) => (
          <button
            key={g.name}
            type="button"
            className={`devwind-category-nav__tab${g.name === activeCategory ? ' devwind-category-nav__tab--active' : ''}`}
            onClick={() => setActiveCategory(g.name)}
          >
            {translateCategory(g.name, language)}
          </button>
        ))}
      </div>
      <div
        className={`devwind-category-nav__resize-handle${resizing ? ' devwind-category-nav__resize-handle--active' : ''}`}
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionner la colonne des catégories"
        onMouseDown={startResize}
        onDoubleClick={() => {
          setRailWidth(DEFAULT_RAIL_WIDTH)
          void chrome.storage.local.set({ [RAIL_WIDTH_STORAGE_KEY]: DEFAULT_RAIL_WIDTH })
        }}
        title="Glisser pour redimensionner (double-clic pour réinitialiser)"
      />
      <div className="devwind-category-nav__content">
        {group?.subcategories.map((sub) => {
          const entry = taxonomy.find((e) => e.id === sub.classes[0]?.taxonomyId)
          if (!entry) return null
          return (
            <PropertyRow
              key={sub.name}
              entry={entry}
              classes={sub.classes}
              activeClasses={activeClasses}
              variants={variants}
              onApply={onApply}
              onApplyArbitrary={(prefix, value) => onApplyArbitrary(entry.id, prefix, value)}
            />
          )
        })}
      </div>
    </div>
  )
}
