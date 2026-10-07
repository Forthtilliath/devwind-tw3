import Popover from './Popover'
import { useDevPanelStore } from '../store/useDevPanelStore'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import { formatChangeLog, formatFinalClasses } from '../store/history'
import { useT } from '../i18n/useT'

/** Historique de TOUTES les modifications de la session (pas juste l'élément sélectionné) :
 * répond au besoin de retrouver l'ensemble des changements faits à différents endroits de la
 * page sans avoir à s'en souvenir soi-même, et de les annuler une à une. Le plus récent en
 * premier (scan rapide "qu'est-ce que je viens de faire"). */
export default function ChangeLogPanel() {
  const t = useT()
  const changeLog = useDevPanelStore((s) => s.changeLog)
  const clearChangeLog = useDevPanelStore((s) => s.clearChangeLog)
  const revertEntry = useDevPanelStore((s) => s.revertEntry)
  const requestFinalClasses = useDevPanelStore((s) => s.requestFinalClasses)
  const showNotice = useDevPanelStore((s) => s.showNotice)
  const { copied, copy } = useCopyToClipboard()

  const newestFirst = [...changeLog].reverse()
  const appliedCount = changeLog.filter((e) => e.undoneSeq === undefined).length

  async function copyFinalClasses() {
    const elements = await requestFinalClasses()
    if (elements.length === 0) {
      showNotice('notice.finalEmpty')
      return
    }
    if (!(await copy(formatFinalClasses(elements), 'final'))) showNotice('notice.copyFailed')
  }

  return (
    <Popover
      triggerClassName="devwind-changelog-btn"
      ariaLabel={t('history.trigger', { count: appliedCount })}
      title={t('history.title')}
      label={
        <>
          🕘{appliedCount > 0 && <span className="devwind-changelog-btn__count">{appliedCount}</span>}
        </>
      }
    >
      {() => (
        <div className="devwind-changelog">
          <div className="devwind-changelog__header">
            <span>{t('history.title')}</span>
            <div className="devwind-changelog__actions">
              <button
                type="button"
                title={t('history.copyTitle')}
                onClick={() => void copy(formatChangeLog(changeLog), 'log')}
                disabled={appliedCount === 0}
              >
                {copied === 'log' ? t('history.copied') : t('history.copy')}
              </button>
              <button type="button" title={t('history.copyFinalTitle')} onClick={() => void copyFinalClasses()} disabled={appliedCount === 0}>
                {copied === 'final' ? t('history.copied') : t('history.copyFinal')}
              </button>
              <button type="button" onClick={clearChangeLog} disabled={changeLog.length === 0}>
                {t('history.clear')}
              </button>
            </div>
          </div>
          {changeLog.length === 0 ? (
            <p className="devwind-empty">{t('history.empty')}</p>
          ) : (
            <ul className="devwind-changelog__list">
              {newestFirst.map((entry) => {
                const undone = entry.undoneSeq !== undefined
                return (
                  <li key={entry.id} className={`devwind-changelog__entry${undone ? ' devwind-changelog__entry--undone' : ''}`}>
                    <span className="devwind-changelog__element" title={entry.selector}>
                      {entry.elementLabel}
                    </span>
                    <span className="devwind-changelog__diff">
                      {entry.added.map((c) => (
                        <span key={`a-${c}`} className="devwind-changelog__added">
                          +{c}
                        </span>
                      ))}
                      {entry.removed.map((c) => (
                        <span key={`r-${c}`} className="devwind-changelog__removed">
                          −{c}
                        </span>
                      ))}
                    </span>
                    <button
                      type="button"
                      className="devwind-changelog__revert"
                      aria-label={t(undone ? 'history.redoLabel' : 'history.undoLabel', { element: entry.elementLabel })}
                      onClick={() => revertEntry(entry.id, !undone)}
                    >
                      {undone ? `↷ ${t('history.redo')}` : `↶ ${t('history.undo')}`}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </Popover>
  )
}
