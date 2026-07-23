import { useEffect } from 'react'
import { useDevPanelStore } from '../store/useDevPanelStore'

interface CustomClassesSectionProps {
  activeClasses: string[]
}

/** Classes non reconnues comme Tailwind, trouvées en scannant le CSS chargé par la page. */
export default function CustomClassesSection({ activeClasses }: CustomClassesSectionProps) {
  const customScan = useDevPanelStore((s) => s.customScan)
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
        Custom / Autres classes ({classNames.length})
        {customScan.unscannable.length > 0 && (
          <span className="devwind-badge" title={customScan.unscannable.join('\n')}>
            {customScan.unscannable.length} feuille(s) non scannable(s)
          </span>
        )}
        {customScan.detectedPrefix && (
          <span
            className="devwind-badge"
            title="Détecté par heuristique : les classes de ce site semblent préfixées. Reconnues à l'affichage, mais leur remplacement via le panneau ou leur prévisualisation avec d'autres variants peut être imprécis (préfixe non pris en compte)."
          >
            préfixe détecté : {customScan.detectedPrefix}:
          </span>
        )}
      </summary>
      <div className="devwind-value-grid">
        {classNames.map((cls) => (
          <button
            key={cls}
            type="button"
            className={`devwind-value${activeClasses.includes(cls) ? ' devwind-value--active' : ''}`}
            title={customScan.found.get(cls)?.join(', ')}
            onClick={() => toggleClass(cls)}
          >
            <span className="devwind-value__label">{cls}</span>
          </button>
        ))}
        {classNames.length === 0 && <p className="devwind-empty">Aucune classe custom détectée sur cette page.</p>}
      </div>
    </details>
  )
}
