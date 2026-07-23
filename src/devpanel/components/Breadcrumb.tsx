import type { AncestorInfo } from '../../types'

interface BreadcrumbProps {
  ancestors: AncestorInfo[]
  tagName: string
  onSelectAncestor: (index: number) => void
}

function formatAncestor(a: AncestorInfo): string {
  const id = a.id ? `#${a.id}` : ''
  const cls = a.classes[0] ? `.${a.classes[0]}` : ''
  return `${a.tagName}${id}${cls}`
}

/** Fil d'ariane des ancêtres (parent direct → `<body>`) : remonter dans le DOM sans avoir à
 * re-cliquer précisément dessus dans la page, utile pour les éléments imbriqués/petits. */
export default function Breadcrumb({ ancestors, tagName, onSelectAncestor }: BreadcrumbProps) {
  if (ancestors.length === 0) return null

  // Affiché du plus haut (body) au plus proche (parent direct), élément sélectionné en dernier.
  const ordered = [...ancestors].map((a, index) => ({ a, index })).reverse()

  return (
    <nav className="devwind-breadcrumb" aria-label="Ancêtres de l'élément sélectionné">
      {ordered.map(({ a, index }) => (
        <span key={index} className="devwind-breadcrumb__segment">
          <button type="button" className="devwind-breadcrumb__item" onClick={() => onSelectAncestor(index)}>
            {formatAncestor(a)}
          </button>
          <span className="devwind-breadcrumb__sep">›</span>
        </span>
      ))}
      <span className="devwind-breadcrumb__current">{tagName}</span>
    </nav>
  )
}
