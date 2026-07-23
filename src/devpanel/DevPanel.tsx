import { useEffect, useState } from 'react'
import { useDevPanelStore } from './store/useDevPanelStore'
import ClassChip from './components/ClassChip'
import SearchBar from './components/SearchBar'
import CategoryNav from './components/CategoryNav'
import CustomClassesSection from './components/CustomClassesSection'
import ThemeVariablesSection from './components/ThemeVariablesSection'
import VariantToolbar from './components/VariantToolbar'
import Breadcrumb from './components/Breadcrumb'
import RecentClasses from './components/RecentClasses'
import Popover from './components/Popover'
import ContrastBadge from './components/ContrastBadge'
import ChangeLogPanel from './components/ChangeLogPanel'
import { searchClasses } from './data'
import { loadTheme, setTheme, NEXT_THEME, THEME_ICON } from './theme'
import { translateCategory, translateSubcategory, LANGUAGE_LABEL } from './i18n'
import type { ThemePreference } from './theme'
import type { GeneratedClass, NavigateDirection } from '../types'

function arbitraryClassName(prefix: string, value: string): string {
  return prefix === '' ? `[${value}]` : `${prefix}-[${value}]`
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
  const [copied, setCopied] = useState(false)
  const [theme, setThemeState] = useState<ThemePreference>('auto')
  const connectionState = useDevPanelStore((s) => s.connectionState)
  const tagName = useDevPanelStore((s) => s.tagName)
  const activeClasses = useDevPanelStore((s) => s.activeClasses)
  const unsupportedClasses = useDevPanelStore((s) => s.unsupportedClasses)
  const ancestors = useDevPanelStore((s) => s.ancestors)
  const search = useDevPanelStore((s) => s.search)
  const setSearch = useDevPanelStore((s) => s.setSearch)
  const applyChange = useDevPanelStore((s) => s.applyChange)
  const removeClass = useDevPanelStore((s) => s.removeClass)
  const activeVariants = useDevPanelStore((s) => s.activeVariants)
  const toggleVariant = useDevPanelStore((s) => s.toggleVariant)
  const selectAncestor = useDevPanelStore((s) => s.selectAncestor)
  const navigate = useDevPanelStore((s) => s.navigate)
  const locked = useDevPanelStore((s) => s.locked)
  const toggleLocked = useDevPanelStore((s) => s.toggleLocked)
  const recentClasses = useDevPanelStore((s) => s.recentClasses)
  const recordRecent = useDevPanelStore((s) => s.recordRecent)
  const elementColors = useDevPanelStore((s) => s.elementColors)
  const language = useDevPanelStore((s) => s.language)
  const cycleLanguage = useDevPanelStore((s) => s.cycleLanguage)

  useEffect(() => {
    void loadTheme().then(setThemeState)
  }, [])

  // Navigation clavier (parent/enfant/frères) + focus recherche (Ctrl/Cmd+F), désactivées si
  // on tape déjà dans un champ texte.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        document.getElementById('devwind-search-input')?.focus()
        return
      }
      if (!tagName) return
      if (isTypingTarget(document.activeElement)) return
      const direction = ARROW_TO_DIRECTION[e.key]
      if (!direction) return
      e.preventDefault()
      navigate(direction)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [tagName, navigate])

  if (connectionState === 'disconnected') {
    return (
      <div className="devwind-panel devwind-panel--empty">
        <p>Page fermée ou rechargée — tu peux fermer cette fenêtre.</p>
      </div>
    )
  }

  const searchResults = search.trim() ? searchClasses(search) : []
  const searchActiveName = (className: string) => [...activeVariants, className].join(':')

  function applyItem(item: GeneratedClass) {
    applyChange({ taxonomyId: item.taxonomyId, prefix: item.prefix, variants: activeVariants, newBase: item.className })
    recordRecent(item)
  }

  function applyArbitrary(taxonomyId: string, prefix: string, value: string) {
    applyChange({ taxonomyId, prefix, variants: activeVariants, newBase: arbitraryClassName(prefix, value) })
  }

  async function copyAs(format: 'plain' | 'jsx') {
    const text = format === 'jsx' ? `className="${activeClasses.join(' ')}"` : activeClasses.join(' ')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  async function cycleTheme() {
    const next = NEXT_THEME[theme]
    setThemeState(next)
    await setTheme(next)
  }

  return (
    <div className="devwind-panel">
      <header className="devwind-panel__header">
        <span className="devwind-panel__title">DevWind</span>
        <div className="devwind-panel__header-right">
          <button
            type="button"
            className="devwind-theme-btn"
            onClick={() => void cycleTheme()}
            title={`Thème : ${theme} (clic pour changer)`}
          >
            {THEME_ICON[theme]}
          </button>
          <button
            type="button"
            className="devwind-lang-btn"
            onClick={cycleLanguage}
            title="Langue des libellés de catégorie (clic pour changer)"
          >
            {LANGUAGE_LABEL[language]}
          </button>
          <button
            type="button"
            className={`devwind-lock-btn${locked ? ' devwind-lock-btn--active' : ''}`}
            onClick={toggleLocked}
            title={locked ? 'Déverrouiller (reprendre la sélection au survol/clic)' : 'Verrouiller la sélection (interagir avec la page sans la perdre)'}
          >
            {locked ? '🔒' : '🔓'}
          </button>
          <ChangeLogPanel />
          {tagName && (
            <>
              <span className="devwind-panel__count">
                &lt;{tagName}&gt; · {activeClasses.length} classes
              </span>
              {activeClasses.length > 0 && (
                <Popover label={copied ? 'Copié !' : 'Copier ▾'} triggerClassName="devwind-copy-btn">
                  {(close) => (
                    <div className="devwind-export__menu">
                      <button
                        type="button"
                        onClick={() => {
                          void copyAs('plain')
                          close()
                        }}
                      >
                        Classes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void copyAs('jsx')
                          close()
                        }}
                      >
                        JSX (className="…")
                      </button>
                    </div>
                  )}
                </Popover>
              )}
            </>
          )}
        </div>
      </header>

      {!tagName ? (
        <p className="devwind-hint">Clique sur un élément de la page pour éditer ses classes.</p>
      ) : (
        <>
          <Breadcrumb ancestors={ancestors} tagName={tagName} onSelectAncestor={selectAncestor} />
          {elementColors && (
            <div className="devwind-contrast-row">
              <span className="devwind-contrast-row__label">Contraste texte/fond :</span>
              <ContrastBadge
                foreground={elementColors.color}
                background={elementColors.backgroundColor}
                fontSize={elementColors.fontSize}
                bold={elementColors.bold}
              />
            </div>
          )}
          <VariantToolbar activeVariants={activeVariants} onToggle={toggleVariant} />
          <RecentClasses items={recentClasses} activeClasses={activeClasses} variants={activeVariants} onApply={applyItem} />
          <SearchBar value={search} onChange={setSearch} />

          {searchResults.length > 0 ? (
            <div className="devwind-value-grid devwind-search-results">
              {searchResults.slice(0, 60).map((item) => (
                <button
                  key={item.className}
                  type="button"
                  className={`devwind-value${activeClasses.includes(searchActiveName(item.className)) ? ' devwind-value--active' : ''}${item.category === 'Couleurs' ? ' devwind-value--color' : ''}`}
                  title={`${translateCategory(item.category, language)} / ${item.subcategory ? translateSubcategory(item.subcategory, language) : ''}`}
                  onClick={() => applyItem(item)}
                >
                  {item.category === 'Couleurs' && (
                    <span className="devwind-value__swatch" style={{ background: item.themeToken ?? undefined }} />
                  )}
                  <span className="devwind-value__label">{item.className}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <section className="devwind-panel__chips">
                {activeClasses.length === 0 ? (
                  <p className="devwind-empty">Aucune classe sur cet élément.</p>
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
                onApplyArbitrary={applyArbitrary}
              />

              <CustomClassesSection activeClasses={activeClasses} />
              <ThemeVariablesSection />
            </>
          )}
        </>
      )}
    </div>
  )
}
