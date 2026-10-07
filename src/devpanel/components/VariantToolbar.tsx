import { useState } from 'react'
import { sortedBreakpointNames } from '../../core/breakpoints'
import { useDevPanelStore } from '../store/useDevPanelStore'
import { useT } from '../i18n/useT'

const PSEUDO = ['hover', 'focus', 'active', 'disabled', 'dark']
/** Variants fréquents mais secondaires : derrière "Plus de variants" pour garder la barre compacte. */
const MORE = ['focus-visible', 'focus-within', 'group-hover', 'group-focus', 'peer-hover', 'peer-focus', 'first', 'last', 'odd', 'even', 'visited']

interface PillProps {
  variant: string
  active: boolean
  title?: string
  onToggle: (variant: string) => void
}

function VariantPill({ variant, active, title, onToggle }: PillProps) {
  return (
    <button
      type="button"
      className={`devwind-variant-pill${active ? ' devwind-variant-pill--active' : ''}`}
      aria-pressed={active}
      title={title}
      onClick={() => onToggle(variant)}
    >
      {variant}
    </button>
  )
}

/** Toolbar de variants persistante : plutôt que des préfixes textuels noyés dans les noms de
 * classes, un état d'édition explicite — toute valeur choisie ensuite dans un picker s'applique
 * dans ce contexte de variant (breakpoint + pseudo-classes, combinables). Les breakpoints sont
 * ceux du site (seuils lus dans son CSS), à défaut ceux de Tailwind. */
export default function VariantToolbar() {
  const t = useT()
  const activeVariants = useDevPanelStore((s) => s.activeVariants)
  const breakpoints = useDevPanelStore((s) => s.breakpoints)
  const onToggle = useDevPanelStore((s) => s.toggleVariant)
  const resetVariants = useDevPanelStore((s) => s.resetVariants)
  const [customValue, setCustomValue] = useState('')
  const [showMore, setShowMore] = useState(false)

  const breakpointNames = sortedBreakpointNames(breakpoints)
  const known = new Set<string>([...breakpointNames, ...breakpointNames.map((b) => `max-${b}`), ...PSEUDO, ...MORE])
  const customActive = activeVariants.filter((v) => !known.has(v))
  // Un variant "plus" actif reste visible même repliée : on voit toujours le contexte d'édition.
  const moreVisible = showMore ? MORE : MORE.filter((v) => activeVariants.includes(v))

  return (
    <div className="devwind-variant-toolbar">
      <div className="devwind-variant-toolbar__group">
        {breakpointNames.map((bp) => (
          <VariantPill
            key={bp}
            variant={bp}
            active={activeVariants.includes(bp)}
            title={t('variants.breakpointTitle', { width: breakpoints[bp] })}
            onToggle={onToggle}
          />
        ))}
      </div>
      <div className="devwind-variant-toolbar__group">
        {PSEUDO.map((p) => (
          <VariantPill key={p} variant={p} active={activeVariants.includes(p)} onToggle={onToggle} />
        ))}
        {moreVisible.map((p) => (
          <VariantPill key={p} variant={p} active={activeVariants.includes(p)} onToggle={onToggle} />
        ))}
        <button
          type="button"
          className="devwind-variant-toolbar__more"
          aria-expanded={showMore}
          aria-label={t('variants.more')}
          title={t('variants.more')}
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? '−' : '+'}
        </button>
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
            aria-label={t('variants.removeCustom', { variant: v })}
            title={t('variants.removeCustom', { variant: v })}
            onClick={() => onToggle(v)}
          >
            {v} ×
          </button>
        ))}
        <input
          type="text"
          placeholder={t('variants.customPlaceholder')}
          aria-label={t('variants.customLabel')}
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
        />
        {activeVariants.length > 0 && (
          <button type="button" className="devwind-variant-toolbar__reset" aria-label={t('variants.resetLabel')} onClick={resetVariants}>
            ↺ {t('variants.reset')}
          </button>
        )}
      </form>
    </div>
  )
}
