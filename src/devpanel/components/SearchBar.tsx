interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

/** Recherche globale transversale (pas par catégorie) : taper "red" saute direct au bon endroit. */
export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <input
      id="devwind-search-input"
      type="text"
      className="devwind-search"
      placeholder="Rechercher une classe (ex. bg-red, p-4)… (Ctrl/Cmd+F)"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
