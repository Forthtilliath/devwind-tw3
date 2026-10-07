import { useEffect, useState } from 'react'
import Popover from './Popover'
import ChangeLogPanel from './ChangeLogPanel'
import { useDevPanelStore } from '../store/useDevPanelStore'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import { pickRedoTarget, pickUndoTarget } from '../store/history'
import { loadTheme, setTheme, NEXT_THEME, THEME_ICON } from '../theme'
import { LANGUAGE_LABEL } from '../i18n'
import { useT } from '../i18n/useT'
import type { ThemePreference } from '../theme'

/** Barre du haut : réglages (thème, langue), verrou, annuler/rétablir, historique, copie. */
export default function PanelHeader() {
  const t = useT()
  const { copied, copy } = useCopyToClipboard()
  const [theme, setThemeState] = useState<ThemePreference>('auto')
  const tagName = useDevPanelStore((s) => s.tagName)
  const activeClasses = useDevPanelStore((s) => s.activeClasses)
  const locked = useDevPanelStore((s) => s.locked)
  const toggleLocked = useDevPanelStore((s) => s.toggleLocked)
  const language = useDevPanelStore((s) => s.language)
  const cycleLanguage = useDevPanelStore((s) => s.cycleLanguage)
  const canUndo = useDevPanelStore((s) => pickUndoTarget(s.changeLog) !== null)
  const canRedo = useDevPanelStore((s) => pickRedoTarget(s.changeLog) !== null)
  const undo = useDevPanelStore((s) => s.undo)
  const redo = useDevPanelStore((s) => s.redo)

  useEffect(() => {
    void loadTheme().then(setThemeState)
  }, [])

  async function cycleTheme() {
    const next = NEXT_THEME[theme]
    setThemeState(next)
    await setTheme(next)
  }

  function copyAs(format: 'plain' | 'jsx') {
    const text = format === 'jsx' ? `className="${activeClasses.join(' ')}"` : activeClasses.join(' ')
    void copy(text)
  }

  const themeLabel = t(`header.theme.${theme}`)

  return (
    <header className="devwind-panel__header">
      <span className="devwind-panel__title">DevWind</span>
      <div className="devwind-panel__header-right">
        <button
          type="button"
          className="devwind-theme-btn"
          onClick={() => void cycleTheme()}
          aria-label={t('header.theme', { theme: themeLabel })}
          title={t('header.themeTitle', { theme: themeLabel })}
        >
          {THEME_ICON[theme]}
        </button>
        <button
          type="button"
          className="devwind-lang-btn"
          onClick={cycleLanguage}
          aria-label={t('header.language', { language: LANGUAGE_LABEL[language] })}
          title={t('header.languageTitle')}
        >
          {LANGUAGE_LABEL[language]}
        </button>
        <button
          type="button"
          className={`devwind-lock-btn${locked ? ' devwind-lock-btn--active' : ''}`}
          onClick={toggleLocked}
          aria-label={t('header.lock')}
          aria-pressed={locked}
          title={locked ? t('header.lockTitle.locked') : t('header.lockTitle.unlocked')}
        >
          {locked ? '🔒' : '🔓'}
        </button>
        <button type="button" className="devwind-history-btn" onClick={undo} disabled={!canUndo} aria-label={t('header.undo')} title={t('header.undo')}>
          ↶
        </button>
        <button type="button" className="devwind-history-btn" onClick={redo} disabled={!canRedo} aria-label={t('header.redo')} title={t('header.redo')}>
          ↷
        </button>
        <ChangeLogPanel />
        {tagName && (
          <>
            <span className="devwind-panel__count">{t('panel.count', { tag: tagName, count: activeClasses.length })}</span>
            {activeClasses.length > 0 && (
              <Popover
                label={copied !== null ? t('copy.copied') : t('copy.trigger')}
                ariaLabel={copied !== null ? t('copy.copied') : t('copy.label')}
                triggerClassName="devwind-copy-btn"
              >
                {(close) => (
                  <div className="devwind-export__menu">
                    <button
                      type="button"
                      onClick={() => {
                        copyAs('plain')
                        close()
                      }}
                    >
                      {t('copy.plain')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        copyAs('jsx')
                        close()
                      }}
                    >
                      {t('copy.jsx')}
                    </button>
                  </div>
                )}
              </Popover>
            )}
          </>
        )}
      </div>
    </header>
  )
}
