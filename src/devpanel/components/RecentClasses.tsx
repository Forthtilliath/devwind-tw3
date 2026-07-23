import { formatSuffix } from '../format'
import type { GeneratedClass } from '../../types'

interface RecentClassesProps {
  items: GeneratedClass[]
  activeClasses: string[]
  variants: string[]
  onApply: (item: GeneratedClass) => void
}

/** Dernières valeurs choisies via un picker (ex. une couleur déjà utilisée ailleurs sur le
 * site) : réappliquer en un clic, dans le contexte de variant courant. */
export default function RecentClasses({ items, activeClasses, variants, onApply }: RecentClassesProps) {
  if (items.length === 0) return null

  return (
    <div className="devwind-recent">
      <span className="devwind-recent__label">Récent :</span>
      {items.slice(0, 12).map((item) => (
        <button
          key={item.className}
          type="button"
          className={`devwind-value${activeClasses.includes([...variants, item.className].join(':')) ? ' devwind-value--active' : ''}${item.category === 'Couleurs' ? ' devwind-value--color' : ''}`}
          title={item.className}
          onClick={() => onApply(item)}
        >
          {item.category === 'Couleurs' && (
            <span className="devwind-value__swatch" style={{ background: item.themeToken ?? undefined }} />
          )}
          <span className="devwind-value__label">{formatSuffix(item)}</span>
        </button>
      ))}
    </div>
  )
}
