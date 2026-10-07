import { useDeferredValue, useEffect, useMemo } from 'react'
import { useDevPanelStore } from './store/useDevPanelStore'
import ClassChip from './components/ClassChip'
import SearchBar from './components/SearchBar'
import SearchResults from './components/SearchResults'
import CategoryNav from './components/CategoryNav'
import CustomClassesSection from './components/CustomClassesSection'
import VariantToolbar from './components/VariantToolbar'
import Breadcrumb from './components/Breadcrumb'
import RecentClasses from './components/RecentClasses'
import ContrastBadge from './components/ContrastBadge'
import PanelHeader from './components/PanelHeader'
import DisconnectedState from './components/DisconnectedState'
import NoticeToast from './components/NoticeToast'
import { searchClasses } from './search'
import { useT } from './i18n/useT'
import type { GeneratedClass, NavigateDirection } from '../types'

/** Une classe ne peut pas contenir d'espace : convention Tailwind, `_` représente un espace dans
 * une valeur arbitraire (`rgb(0 0 0)` -> `bg-[rgb(0_0_0)]`, reconverti par live-style.ts). */
function arbitraryClassName(prefix: string, value: string): string {
  const encoded = value.trim().replace(/\s+/g, '_')
  return prefix === '' ? `[${encoded}]` : `${prefix}-[${encoded}]`
}

const ARROW_TO_DIRECTION: Record<string, NavigateDirection> = {
  ArrowUp: 'parent',
  ArrowDown: 'child',
  ArrowLeft: 'prev',
  ArrowRight: 'next',
}

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable
}

export default function DevPanel() {
  const t = useT()
  const connectionState = useDevPanelStore((s) => s.connectionState)
  const tagName = useDevPanelStore((s) => s.tagName)
  const selectionDetached = useDevPanelStore((s) => s.selectionDetached)
  const activeClasses = useDevPanelStore((s) => s.activeClasses)
  const unsupportedClasses = useDevPanelStore((s) => s.unsupportedClasses)
  const ancestors = useDevPanelStore((s) => s.ancestors)
  const search = useDevPanelStore((s) => s.search)
  // Filtrage des ~5 000 classes en priorité basse : la frappe reste fluide, les résultats suivent.
  const deferredSearch = useDeferredValue(search)
  const searchResult = useMemo(() => searchClasses(deferredSearch), [deferredSearch])
  const setSearch = useDevPanelStore((s) => s.setSearch)
  const applyChange = useDevPanelStore((s) => s.applyChange)
  const previewChange = useDevPanelStore((s) => s.previewChange)
  const removeClass = useDevPanelStore((s) => s.removeClass)
  const activeVariants = useDevPanelStore((s) => s.activeVariants)
  const selectAncestor = useDevPanelStore((s) => s.selectAncestor)
  const navigate = useDevPanelStore((s) => s.navigate)
  const undo = useDevPanelStore((s) => s.undo)
  const redo = useDevPanelStore((s) => s.redo)
  const recentClasses = useDevPanelStore((s) => s.recentClasses)
  const recordRecent = useDevPanelStore((s) => s.recordRecent)
  const elementColors = useDevPanelStore((s) => s.elementColors)

  // Raccourcis globaux, inactifs dans un champ texte (qui garde son propre Ctrl+Z) : annuler/
  // rétablir, navigation parent/enfant/frères, focus de la recherche (Ctrl/Cmd+F).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Touches déjà consommées par un composant (ex. poignée de redimensionnement du rail).
      if (e.defaultPrevented) return
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (mod && key === 'f') {
        e.preventDefault()
        document.getElementById('devwind-search-input')?.focus()
        return
      }
      if (isTypingTarget(document.activeElement)) return
      if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
        return
      }
      if (mod && key === 'z') {
        e.preventDefault()
        undo()
        return
      }
      if (!tagName) return
      const direction = ARROW_TO_DIRECTION[e.key]
      if (!direction) return
      e.preventDefault()
      navigate(direction)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [tagName, navigate, undo, redo])

  if (connectionState === 'disconnected') return <DisconnectedState />
  if (connectionState === 'invalid') {
    return (
      <div className="devwind-panel devwind-panel--empty">
        <p>{t('panel.invalidTab')}</p>
      </div>
    )
  }

  function applyItem(item: GeneratedClass) {
    applyChange({ taxonomyId: item.taxonomyId, prefix: item.prefix, variants: activeVariants, newBase: item.className })
    recordRecent(item)
  }

  function previewItem(item: GeneratedClass | null) {
    previewChange(item && { taxonomyId: item.taxonomyId, prefix: item.prefix, variants: activeVariants, newBase: item.className })
  }

  function applyArbitrary(taxonomyId: string, prefix: string, value: string) {
    applyChange({ taxonomyId, prefix, variants: activeVariants, newBase: arbitraryClassName(prefix, value) })
  }

  return (
    <div className="devwind-panel">
      <PanelHeader />

      {!tagName ? (
        <p className="devwind-hint">{selectionDetached ? t('panel.detachedHint') : t('panel.selectHint')}</p>
      ) : (
        <>
          <Breadcrumb ancestors={ancestors} tagName={tagName} onSelectAncestor={selectAncestor} />
          {elementColors && (
            <div className="devwind-contrast-row">
              <span className="devwind-contrast-row__label">{t('contrast.label')}</span>
              <ContrastBadge
                foreground={elementColors.color}
                backgrounds={[elementColors.backgroundColor, ...elementColors.backdrop]}
                fontSize={elementColors.fontSize}
                bold={elementColors.bold}
                approximate={elementColors.approximate}
              />
            </div>
          )}
          <VariantToolbar />
          <RecentClasses items={recentClasses} activeClasses={activeClasses} variants={activeVariants} onApply={applyItem} />
          <SearchBar value={search} onChange={setSearch} />

          {deferredSearch.trim() ? (
            <SearchResults query={deferredSearch} result={searchResult} activeClasses={activeClasses} variants={activeVariants} onApply={applyItem} />
          ) : (
            <>
              <section className="devwind-panel__chips">
                {activeClasses.length === 0 ? (
                  <p className="devwind-empty">{t('panel.noClasses')}</p>
                ) : (
                  activeClasses.map((c) => (
                    <ClassChip key={c} rawClass={c} onRemove={removeClass} unsupported={unsupportedClasses.includes(c)} />
                  ))
                )}
              </section>

              <CategoryNav
                activeClasses={activeClasses}
                variants={activeVariants}
                onApply={applyItem}
                onPreview={previewItem}
                onApplyArbitrary={applyArbitrary}
              />

              <CustomClassesSection activeClasses={activeClasses} />
            </>
          )}
        </>
      )}
      <NoticeToast />
    </div>
  )
}
