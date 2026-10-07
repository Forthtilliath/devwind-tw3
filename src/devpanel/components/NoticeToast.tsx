import { useDevPanelStore } from '../store/useDevPanelStore'
import { useT } from '../i18n/useT'

/** Message temporaire du panneau (annulation refusée, rien à rétablir...), annoncé aux
 * lecteurs d'écran sans prendre le focus. */
export default function NoticeToast() {
  const t = useT()
  const notice = useDevPanelStore((s) => s.notice)
  const dismissNotice = useDevPanelStore((s) => s.dismissNotice)

  return (
    <div className="devwind-notice-region" role="status" aria-live="polite">
      {notice && (
        <div className="devwind-notice">
          <span>{t(notice.key, notice.params)}</span>
          <button type="button" className="devwind-notice__close" aria-label={t('notice.dismiss')} onClick={dismissNotice}>
            ×
          </button>
        </div>
      )}
    </div>
  )
}
