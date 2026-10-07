import { useEffect } from 'react'
import { useDevPanelStore } from '../store/useDevPanelStore'
import { useT } from '../i18n/useT'

interface CustomClassesSectionProps {
  activeClasses: string[]
}

/** Classes non reconnues comme Tailwind, trouvées en scannant le CSS chargé par la page. */
export default function CustomClassesSection({ activeClasses }: CustomClassesSectionProps) {
  const t = useT()
  const customScan = useDevPanelStore((s) => s.customScan)
  const sitePrefix = useDevPanelStore((s) => s.sitePrefix)
  const runCssScan = useDevPanelStore((s) => s.runCssScan)
  const toggleClass = useDevPanelStore((s) => s.toggleClass)

  useEffect(() => {
    runCssScan()
  }, [runCssScan])

  if (!customScan) return null
  const classNames = Array.from(customScan.found.keys()).sort()

  return (
    <details className="devwind-custom-section">
      <summary>
        {t('custom.summary', { count: classNames.length })}
        {customScan.unscannable.length > 0 && (
          <span className="devwind-badge" title={customScan.unscannable.join('\n')}>
            {t('custom.unscannable', { count: customScan.unscannable.length })}
          </span>
        )}
        {sitePrefix && (
          <span className="devwind-badge" title={t('custom.prefixTitle')}>
            {t('custom.prefix', { prefix: sitePrefix })}
          </span>
        )}
      </summary>
      <div className="devwind-value-grid">
        {classNames.map((cls) => (
          <button
            key={cls}
            type="button"
            className={`devwind-value${activeClasses.includes(cls) ? ' devwind-value--active' : ''}`}
            aria-pressed={activeClasses.includes(cls)}
            title={customScan.found.get(cls)?.join(', ')}
            onClick={() => toggleClass(cls)}
          >
            <span className="devwind-value__label">{cls}</span>
          </button>
        ))}
        {classNames.length === 0 && <p className="devwind-empty">{t('custom.empty')}</p>}
      </div>
    </details>
  )
}
