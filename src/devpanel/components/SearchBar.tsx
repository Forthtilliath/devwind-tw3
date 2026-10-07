import { useT } from '../i18n/useT'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

/** Recherche globale transversale (pas par catégorie) : taper "red" ou "16px" saute direct au
 * bon endroit. */
export default function SearchBar({ value, onChange }: SearchBarProps) {
  const t = useT()
  return (
    <input
      id="devwind-search-input"
      type="search"
      className="devwind-search"
      placeholder={t('search.placeholder')}
      aria-label={t('search.label')}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
