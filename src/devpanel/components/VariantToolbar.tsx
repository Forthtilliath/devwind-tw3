import { useState } from 'react'

const BREAKPOINTS = ['sm', 'md', 'lg', 'xl', '2xl']
const PSEUDO = ['hover', 'focus', 'active', 'disabled', 'dark']

interface VariantToolbarProps {
  activeVariants: string[]
  onToggle: (variant: string) => void
}

/** Toolbar de variants persistante : plutôt que des préfixes textuels noyés dans les noms de
 * classes, un état d'édition explicite — toute valeur choisie ensuite dans un picker s'applique
 * dans ce contexte de variant (breakpoint + pseudo-classes, combinables). */
export default function VariantToolbar({ activeVariants, onToggle }: VariantToolbarProps) {
  const [customValue, setCustomValue] = useState('')
  const known = new Set([...BREAKPOINTS, ...BREAKPOINTS.map((b) => `max-${b}`), ...PSEUDO])
  const customActive = activeVariants.filter((v) => !known.has(v))

  return (
    <div className="devwind-variant-toolbar">
      <div className="devwind-variant-toolbar__group">
        {BREAKPOINTS.map((bp) => (
          <button
            key={bp}
            type="button"
            className={`devwind-variant-pill${activeVariants.includes(bp) ? ' devwind-variant-pill--active' : ''}`}
            title={`À partir de ${bp}`}
            onClick={() => onToggle(bp)}
          >
            {bp}
          </button>
        ))}
      </div>
      <div className="devwind-variant-toolbar__group">
        {PSEUDO.map((p) => (
          <button
            key={p}
            type="button"
            className={`devwind-variant-pill${activeVariants.includes(p) ? ' devwind-variant-pill--active' : ''}`}
            onClick={() => onToggle(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <form
        className="devwind-variant-toolbar__custom"
        onSubmit={(e) => {
          e.preventDefault()
          const v = customValue.trim()
          if (v) {
            onToggle(v)
            setCustomValue('')
          }
        }}
      >
        {customActive.map((v) => (
          <button
            key={v}
            type="button"
            className="devwind-variant-pill devwind-variant-pill--active"
            title="Retirer ce variant"
            onClick={() => onToggle(v)}
          >
            {v} ×
          </button>
        ))}
        <input
          type="text"
          placeholder="autre… (max-sm, group-hover)"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
        />
      </form>
    </div>
  )
}
