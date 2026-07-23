import { useState } from 'react'
import Popover from './Popover'
import { useDevPanelStore } from '../store/useDevPanelStore'
import type { ChangeLogEntry } from '../../types'

function formatEntryLine(entry: ChangeLogEntry): string {
  const parts = [...entry.added.map((c) => `+${c}`), ...entry.removed.map((c) => `-${c}`)]
  return `${entry.elementLabel}: ${parts.join(' ')}`
}

/** Historique de TOUTES les modifications de la session (pas juste l'élément sélectionné) :
 * répond au besoin de retrouver l'ensemble des changements faits à différents endroits de la
 * page sans avoir à s'en souvenir soi-même. Le plus récent en premier (scan rapide "qu'est-ce
 * que je viens de faire"). */
export default function ChangeLogPanel() {
  const changeLog = useDevPanelStore((s) => s.changeLog)
  const clearChangeLog = useDevPanelStore((s) => s.clearChangeLog)
  const [copied, setCopied] = useState(false)

  const newestFirst = [...changeLog].reverse()

  async function copyAll() {
    await navigator.clipboard.writeText(newestFirst.map(formatEntryLine).join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <Popover
      triggerClassName="devwind-changelog-btn"
      label={
        <>
          🕘{changeLog.length > 0 && <span className="devwind-changelog-btn__count">{changeLog.length}</span>}
        </>
      }
    >
      {() => (
        <div className="devwind-changelog">
          <div className="devwind-changelog__header">
            <span>Historique de la session</span>
            <div className="devwind-changelog__actions">
              <button type="button" onClick={() => void copyAll()} disabled={changeLog.length === 0}>
                {copied ? 'Copié !' : 'Copier'}
              </button>
              <button type="button" onClick={clearChangeLog} disabled={changeLog.length === 0}>
                Vider
              </button>
            </div>
          </div>
          {changeLog.length === 0 ? (
            <p className="devwind-empty">Aucune modification cette session.</p>
          ) : (
            <ul className="devwind-changelog__list">
              {newestFirst.map((entry) => (
                <li key={entry.id} className="devwind-changelog__entry">
                  <span className="devwind-changelog__element">{entry.elementLabel}</span>
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
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Popover>
  )
}
