import { useEffect, useRef, useState } from 'react'
import ContrastBadge from './ContrastBadge'
import type { GeneratedClass } from '../../types'

interface ArbitraryConfig {
  placeholder: string
  onSubmit: (value: string) => void
}

interface ContrastPreviewConfig {
  /** Couleur (déjà `rgb()`/normalisable) contre laquelle comparer chaque candidat. */
  against: string
  /** Le candidat joue le rôle de texte (`textColor`) ou de fond (`backgroundColor`). */
  role: 'foreground' | 'background'
  fontSize: number
  bold: boolean
}

interface ValuePickerListProps {
  items: GeneratedClass[]
  showSwatch: boolean
  activeClassName: string | null
  labelFor: (item: GeneratedClass) => string
  onPick: (item: GeneratedClass) => void
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
export default function ValuePickerList({ items, showSwatch, activeClassName, labelFor, onPick, arbitrary, contrastPreview }: ValuePickerListProps) {
  const [query, setQuery] = useState('')
  const [arbitraryValue, setArbitraryValue] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const rowRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const q = query.trim().toLowerCase()
  const filtered = q ? items.filter((i) => i.className.toLowerCase().includes(q)) : items

  useEffect(() => setHighlighted(0), [query])

  useEffect(() => {
    const item = filtered[highlighted]
    if (item) rowRefs.current.get(item.className)?.scrollIntoView({ block: 'nearest' })
  }, [highlighted, filtered])

  function onSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((i) => Math.max(i - 1, 0))
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
        placeholder="Rechercher…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onSearchKeyDown}
      />
      <div className="devwind-vpl__list">
        {filtered.map((item, index) => (
          <button
            key={item.className}
            ref={(el) => {
              if (el) rowRefs.current.set(item.className, el)
              else rowRefs.current.delete(item.className)
            }}
            type="button"
            className={`devwind-vpl__row${item.className === activeClassName ? ' devwind-vpl__row--active' : ''}${index === highlighted ? ' devwind-vpl__row--highlighted' : ''}`}
            onMouseEnter={() => setHighlighted(index)}
            onClick={() => onPick(item)}
          >
            {showSwatch && <span className="devwind-vpl__swatch" style={{ background: item.themeToken ?? undefined }} />}
            <span className="devwind-vpl__name">{labelFor(item)}</span>
            {contrastPreview && item.themeToken && (
              <ContrastBadge
                foreground={contrastPreview.role === 'foreground' ? item.themeToken : contrastPreview.against}
                background={contrastPreview.role === 'background' ? item.themeToken : contrastPreview.against}
                fontSize={contrastPreview.fontSize}
                bold={contrastPreview.bold}
                compact
              />
            )}
            {!contrastPreview && !showSwatch && item.themeToken && <span className="devwind-vpl__token">{item.themeToken}</span>}
          </button>
        ))}
        {filtered.length === 0 && <p className="devwind-vpl__empty">Aucun résultat</p>}
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
            value={arbitraryValue}
            onChange={(e) => setArbitraryValue(e.target.value)}
          />
          <button type="submit">OK</button>
        </form>
      )}
    </div>
  )
}
