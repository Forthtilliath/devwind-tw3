import { splitVariants } from '../../core/split-variants'
import { useT } from '../i18n/useT'

interface ClassChipProps {
  rawClass: string
  onRemove: (rawClass: string) => void
  /** `live-style` n'a pas pu synthétiser d'effet visuel pour cette classe (variant non géré,
   * ex. `dark:` sans stratégie détectable) — probablement sans effet tant que le site ne
   * régénère pas son CSS avec cette classe réellement utilisée quelque part. */
  unsupported?: boolean
}

/** Chip d'une classe active sur l'élément sélectionné, avec ses badges de variant. */
export default function ClassChip({ rawClass, onRemove, unsupported }: ClassChipProps) {
  const t = useT()
  // Pas de `split(':')` naïf : `bg-[url(https://…)]` contient un `:` hors variant.
  const { variants, base } = splitVariants(rawClass)

  return (
    <span className="devwind-chip">
      {variants.map((v) => (
        <span key={v} className="devwind-chip__variant">
          {v}
        </span>
      ))}
      <span className="devwind-chip__base">{base}</span>
      {unsupported && (
        <span
          className="devwind-chip__warning"
          role="img"
          aria-label={t('chip.unsupported')}
          title={t('chip.unsupportedTitle')}
        >
          ⚠
        </span>
      )}
      <button
        type="button"
        className="devwind-chip__remove"
        aria-label={t('chip.remove', { cls: rawClass })}
        onClick={() => onRemove(rawClass)}
      >
        ×
      </button>
    </span>
  )
}
