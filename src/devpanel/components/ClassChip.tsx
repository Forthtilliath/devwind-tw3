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
  const parts = rawClass.split(':')
  const base = parts.at(-1)!
  const variants = parts.slice(0, -1)

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
          title="Pas d'effet visuel prévisualisable : ce variant n'est pas synthétisable (ex. dark: sans stratégie détectable). La classe est bien appliquée, mais ne s'affichera que si le CSS réel du site la définit."
        >
          ⚠
        </span>
      )}
      <button
        type="button"
        className="devwind-chip__remove"
        aria-label={`Retirer ${rawClass}`}
        onClick={() => onRemove(rawClass)}
      >
        ×
      </button>
    </span>
  )
}
