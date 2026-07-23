import { useState } from 'react'
import Popover from './Popover'
import ValuePickerList from './ValuePickerList'
import SideIcon, { hasSideIcon } from './SideIcon'
import { formatSuffix } from '../format'
import { translateSubcategory } from '../i18n'
import { useDevPanelStore } from '../store/useDevPanelStore'
import type { GeneratedClass, TaxonomyEntry } from '../../types'

interface PropertyRowProps {
  entry: TaxonomyEntry
  classes: GeneratedClass[]
  activeClasses: string[]
  /** Contexte de variant courant (ex. ['md','hover']) : détermine quel slot est "actif" et
   * dans quel contexte les nouvelles valeurs choisies s'appliquent. */
  variants: string[]
  onApply: (item: GeneratedClass) => void
  onApplyArbitrary: (prefix: string, value: string) => void
}

function withVariants(variants: string[], className: string): string {
  return [...variants, className].join(':')
}

/**
 * Une ligne compacte par propriété (ex. "Background", "Padding") au lieu d'une grille
 * exhaustive toujours dépliée : affiche la valeur active courante, un clic ouvre un popover
 * recherchable pour la changer. Entrées `static` (peu de valeurs) : pills inline, pas de
 * popover — déjà compact avec ≤10 valeurs.
 */
export default function PropertyRow({ entry, classes, activeClasses, variants, onApply, onApplyArbitrary }: PropertyRowProps) {
  const prefixes = entry.prefixes
  const [activePrefix, setActivePrefix] = useState(prefixes[0])
  const elementColors = useDevPanelStore((s) => s.elementColors)
  const language = useDevPanelStore((s) => s.language)
  const label = entry.subcategory ? translateSubcategory(entry.subcategory, language) : entry.subcategory

  if (entry.type === 'static') {
    return (
      <div className="devwind-row">
        <span className="devwind-row__label">{label}</span>
        <div className="devwind-row__pills">
          {classes.map((item) => (
            <button
              key={item.className}
              type="button"
              className={`devwind-pill${activeClasses.includes(withVariants(variants, item.className)) ? ' devwind-pill--active' : ''}`}
              onClick={() => onApply(item)}
            >
              {formatSuffix(item) || item.className}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const itemsForPrefix = classes.filter((c) => c.prefix === activePrefix)
  const activeItem = itemsForPrefix.find((c) => activeClasses.includes(withVariants(variants, c.className))) ?? null
  const isColor = entry.type === 'color'

  // Aperçu de contraste WCAG par candidat (uniquement Background/Texte, cf. demande explicite
  // "tester des couleurs avant de s'engager") : compare contre l'AUTRE couleur actuelle de
  // l'élément (le texte quand on choisit un fond, et inversement).
  const contrastPreview =
    elementColors && entry.id === 'backgroundColor'
      ? { against: elementColors.color, role: 'background' as const, fontSize: elementColors.fontSize, bold: elementColors.bold }
      : elementColors && entry.id === 'textColor'
        ? { against: elementColors.backgroundColor, role: 'foreground' as const, fontSize: elementColors.fontSize, bold: elementColors.bold }
        : undefined

  return (
    <div className="devwind-row">
      <span className="devwind-row__label">{label}</span>

      {prefixes.length > 1 && (
        <div className="devwind-row__sides">
          {prefixes.map((p) => (
            <button
              key={p}
              type="button"
              className={`devwind-side${p === activePrefix ? ' devwind-side--active' : ''}`}
              title={p}
              onClick={() => setActivePrefix(p)}
            >
              {hasSideIcon(p) ? <SideIcon prefix={p} /> : p}
            </button>
          ))}
        </div>
      )}

      <Popover
        triggerClassName={activeItem ? 'devwind-popover__trigger--set' : ''}
        label={
          <>
            {isColor && (
              <span
                className="devwind-value__swatch"
                style={{ background: activeItem?.themeToken ?? 'transparent' }}
              />
            )}
            <span>{activeItem ? formatSuffix(activeItem) : '—'}</span>
          </>
        }
      >
        {(close) => (
          <ValuePickerList
            items={itemsForPrefix}
            showSwatch={isColor}
            activeClassName={activeItem?.className ?? null}
            labelFor={formatSuffix}
            contrastPreview={contrastPreview}
            onPick={(item) => {
              onApply(item)
              close()
            }}
            arbitrary={
              entry.supportsArbitrary
                ? {
                    placeholder: isColor ? '#hex ou css…' : 'valeur css…',
                    onSubmit: (value) => {
                      onApplyArbitrary(activePrefix, value)
                      close()
                    },
                  }
                : undefined
            }
          />
        )}
      </Popover>
    </div>
  )
}
