import { useEffect, useMemo, useRef, useState } from 'react'
import ContrastBadge from './ContrastBadge'
import { useT } from '../i18n/useT'
import type { GeneratedClass } from '../../types'

interface ArbitraryConfig {
  placeholder: string
  onSubmit: (value: string) => void
}

interface ContrastPreviewConfig {
  /** Le candidat joue le rôle de texte (`textColor`) ou de fond (`backgroundColor`). */
  role: 'foreground' | 'background'
  /** Couleur du texte actuel (utilisée seulement si le candidat est un fond). */
  foreground: string
  /** Fonds sous le candidat, le plus proche en premier : fonds des ancêtres si le candidat est
   * un fond, pile de fonds actuelle complète s'il est le texte. */
  backgrounds: string[]
  fontSize: number
  bold: boolean
  approximate: boolean
}

interface ValuePickerListProps {
  items: GeneratedClass[]
  showSwatch: boolean
  activeClassName: string | null
  labelFor: (item: GeneratedClass) => string
  onPick: (item: GeneratedClass) => void
  /** Aperçu temporaire sur la page de la valeur survolée (souris ou ↑/↓), `null` pour revenir
   * à l'état réel (souris sortie de la liste, fermeture). */
  onPreview?: (item: GeneratedClass | null) => void
  arbitrary?: ArbitraryConfig
  /** Aperçu de contraste WCAG par candidat (uniquement pour Background/Texte) — teste les
   * couleurs "avant de s'engager", cf. demande explicite. */
  contrastPreview?: ContrastPreviewConfig
}

/**
 * Un seul composant de liste recherchable réutilisé pour les entrées `scale` ET `color` :
 * la recherche règle déjà le problème d'un mur de valeurs (taper "red" ou "500" filtre
 * instantanément un mur de 242 couleurs) — pas besoin de deux composants dédiés bespoke.
 * Navigable au clavier (↑/↓ pour déplacer la surbrillance, Entrée pour choisir).
 */
export default function ValuePickerList({
  items,
  showSwatch,
  activeClassName,
  labelFor,
  onPick,
  onPreview,
  arbitrary,
  contrastPreview,
}: ValuePickerListProps) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [arbitraryValue, setArbitraryValue] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const rowRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  // Dernier `onPreview` reçu, pour l'annulation au démontage sans relancer l'effet à chaque rendu.
  const onPreviewRef = useRef(onPreview)
  onPreviewRef.current = onPreview

  useEffect(() => () => onPreviewRef.current?.(null), [])

  function highlight(index: number, item: GeneratedClass | undefined) {
    setHighlighted(index)
    if (item) onPreview?.(item)
  }

  // Référence stable entre rendus (survol = nouveau rendu) : sinon l'effet `scrollIntoView`
  // ci-dessous se relance à chaque rendu.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter((i) => i.className.toLowerCase().includes(q)) : items
  }, [items, query])

  useEffect(() => setHighlighted(0), [query])

  useEffect(() => {
    const item = filtered[highlighted]
    if (item) rowRefs.current.get(item.className)?.scrollIntoView({ block: 'nearest' })
  }, [highlighted, filtered])

  function onSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = e.key === 'ArrowDown' ? Math.min(highlighted + 1, filtered.length - 1) : Math.max(highlighted - 1, 0)
      highlight(next, filtered[next])
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[highlighted]
      if (item) onPick(item)
    }
  }

  return (
    <div className="devwind-vpl">
      <input
        autoFocus
        type="text"
        className="devwind-vpl__search"
        placeholder={t('picker.filter')}
        aria-label={t('picker.filterLabel')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onSearchKeyDown}
      />
      <div className="devwind-vpl__list" onMouseLeave={() => onPreview?.(null)}>
        {filtered.map((item, index) => (
          <button
            key={item.className}
            ref={(el) => {
              if (el) rowRefs.current.set(item.className, el)
              else rowRefs.current.delete(item.className)
            }}
            type="button"
            className={`devwind-vpl__row${item.className === activeClassName ? ' devwind-vpl__row--active' : ''}${index === highlighted ? ' devwind-vpl__row--highlighted' : ''}`}
            aria-pressed={item.className === activeClassName}
            onMouseEnter={() => highlight(index, item)}
            onClick={() => onPick(item)}
          >
            {showSwatch && <span className="devwind-vpl__swatch" aria-hidden="true" style={{ background: item.themeToken ?? undefined }} />}
            <span className="devwind-vpl__name">{labelFor(item)}</span>
            {contrastPreview && item.themeToken && (
              <ContrastBadge
                foreground={contrastPreview.role === 'foreground' ? item.themeToken : contrastPreview.foreground}
                backgrounds={
                  contrastPreview.role === 'background' ? [item.themeToken, ...contrastPreview.backgrounds] : contrastPreview.backgrounds
                }
                fontSize={contrastPreview.fontSize}
                bold={contrastPreview.bold}
                approximate={contrastPreview.approximate}
                compact
              />
            )}
            {!contrastPreview && !showSwatch && item.themeToken && <span className="devwind-vpl__token">{item.themeToken}</span>}
          </button>
        ))}
        {filtered.length === 0 && <p className="devwind-vpl__empty">{t('picker.empty')}</p>}
      </div>
      {arbitrary && (
        <form
          className="devwind-vpl__arbitrary"
          onSubmit={(e) => {
            e.preventDefault()
            const v = arbitraryValue.trim()
            if (v) arbitrary.onSubmit(v)
          }}
        >
          <input
            type="text"
            placeholder={arbitrary.placeholder}
            aria-label={t('picker.arbitraryLabel')}
            value={arbitraryValue}
            onChange={(e) => setArbitraryValue(e.target.value)}
          />
          <button type="submit" aria-label={t('picker.arbitrarySubmit')}>
            OK
          </button>
        </form>
      )}
    </div>
  )
}
