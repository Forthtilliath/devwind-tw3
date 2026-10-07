import { useState } from 'react'
import Popover from './Popover'
import ValuePickerList from './ValuePickerList'
import SideIcon, { hasSideIcon } from './SideIcon'
import { formatSuffix } from '../format'
import { joinVariants } from '../../core/split-variants'
import { translateSubcategory } from '../i18n'
import { useT } from '../i18n/useT'
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
  onPreview: (item: GeneratedClass | null) => void
  onApplyArbitrary: (prefix: string, value: string) => void
}

/**
 * Une ligne compacte par propriété (ex. "Background", "Padding") au lieu d'une grille
 * exhaustive toujours dépliée : affiche la valeur active courante, un clic ouvre un popover
 * recherchable pour la changer (survoler une valeur la prévisualise sur la page). Entrées
 * `static` (peu de valeurs) : pills inline, pas de popover — déjà compact avec ≤10 valeurs.
 */
export default function PropertyRow({ entry, classes, activeClasses, variants, onApply, onPreview, onApplyArbitrary }: PropertyRowProps) {
  const t = useT()
  const prefixes = entry.prefixes
  const [activePrefix, setActivePrefix] = useState(prefixes[0])
  const elementColors = useDevPanelStore((s) => s.elementColors)
  const language = useDevPanelStore((s) => s.language)
  const label = entry.subcategory ? translateSubcategory(entry.subcategory, language) : entry.subcategory
  const suffixOf = (item: GeneratedClass) => formatSuffix(item, t('property.default'))

  if (entry.type === 'static') {
    return (
      <div className="devwind-row">
        <span className="devwind-row__label">{label}</span>
        <div className="devwind-row__pills">
          {classes.map((item) => {
            const active = activeClasses.includes(joinVariants(variants, item.className))
            return (
              <button
                key={item.className}
                type="button"
                className={`devwind-pill${active ? ' devwind-pill--active' : ''}`}
                aria-pressed={active}
                onClick={() => onApply(item)}
              >
                {suffixOf(item) || item.className}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const itemsForPrefix = classes.filter((c) => c.prefix === activePrefix)
  const activeItem = itemsForPrefix.find((c) => activeClasses.includes(joinVariants(variants, c.className))) ?? null
  const isColor = entry.type === 'color'

  // Aperçu de contraste WCAG par candidat (uniquement Background/Texte, cf. demande explicite
  // "tester des couleurs avant de s'engager") : compare contre l'AUTRE couleur actuelle de
  // l'élément (le texte quand on choisit un fond, et inversement).
  const contrastPreview =
    elementColors && (entry.id === 'backgroundColor' || entry.id === 'textColor')
      ? {
          role: entry.id === 'backgroundColor' ? ('background' as const) : ('foreground' as const),
          foreground: elementColors.color,
          backgrounds:
            entry.id === 'backgroundColor' ? elementColors.backdrop : [elementColors.backgroundColor, ...elementColors.backdrop],
          fontSize: elementColors.fontSize,
          bold: elementColors.bold,
          approximate: elementColors.approximate,
        }
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
              aria-label={p}
              aria-pressed={p === activePrefix}
              onClick={() => setActivePrefix(p)}
            >
              {hasSideIcon(p) ? <SideIcon prefix={p} /> : p}
            </button>
          ))}
        </div>
      )}

      <Popover
        triggerClassName={activeItem ? 'devwind-popover__trigger--set' : ''}
        ariaLabel={t('property.value', { label: label ?? '', value: activeItem ? suffixOf(activeItem) : t('property.none') })}
        label={
          <>
            {isColor && (
              <span
                aria-hidden="true"
                className="devwind-value__swatch"
                style={{ background: activeItem?.themeToken ?? 'transparent' }}
              />
            )}
            <span>{activeItem ? suffixOf(activeItem) : '—'}</span>
          </>
        }
      >
        {(close) => (
          <ValuePickerList
            items={itemsForPrefix}
            showSwatch={isColor}
            activeClassName={activeItem?.className ?? null}
            labelFor={suffixOf}
            contrastPreview={contrastPreview}
            onPreview={onPreview}
            onPick={(item) => {
              onApply(item)
              close()
            }}
            arbitrary={
              entry.supportsArbitrary
                ? {
                    placeholder: isColor ? t('property.arbitraryColor') : t('property.arbitrary'),
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
