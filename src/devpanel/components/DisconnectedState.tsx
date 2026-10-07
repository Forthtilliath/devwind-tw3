import { useState } from 'react'
import { focusPageTab, reinjectContentScript } from '../../core/activation'
import { useDevPanelStore } from '../store/useDevPanelStore'
import { useT } from '../i18n/useT'

/** Page rechargée ou fermée : tente une reconnexion directe (possible tant que Chrome n'a pas
 * révoqué l'accès à la page), sinon explique qu'il faut repasser par l'icône DevWind. */
export default function DisconnectedState() {
  const t = useT()
  const tabId = useDevPanelStore((s) => s.tabId)
  const [status, setStatus] = useState<'idle' | 'pending' | 'failed'>('idle')

  async function reconnect() {
    if (tabId === null) return
    setStatus('pending')
    // Le panneau rechargé se reconnecte au démarrage, au content script tout juste réinjecté.
    if (await reinjectContentScript(tabId)) window.location.reload()
    else setStatus('failed')
  }

  return (
    <div className="devwind-panel devwind-panel--empty">
      <p className="devwind-disconnected__title">{t('disconnected.title')}</p>
      <p>{t('disconnected.body')}</p>
      <div className="devwind-disconnected__actions">
        <button type="button" className="devwind-button" disabled={status === 'pending'} onClick={() => void reconnect()}>
          {status === 'pending' ? t('disconnected.reconnecting') : t('disconnected.reconnect')}
        </button>
        {tabId !== null && (
          <button type="button" className="devwind-button devwind-button--secondary" onClick={() => void focusPageTab(tabId)}>
            {t('disconnected.showPage')}
          </button>
        )}
      </div>
      {status === 'failed' && (
        <p className="devwind-disconnected__help" role="status">
          {t('disconnected.failed')}
        </p>
      )}
    </div>
  )
}
