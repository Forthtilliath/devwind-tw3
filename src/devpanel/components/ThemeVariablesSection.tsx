import { useEffect, useState } from 'react'
import { useDevPanelStore } from '../store/useDevPanelStore'

let copyTimer: ReturnType<typeof setTimeout> | null = null

/** Variables de thème Tailwind v4 (`--color-*`, `--radius-*`...) réellement définies sur
 * `:root` du site — indépendant de l'élément sélectionné, sert juste à inspecter le vrai
 * thème du site (utile pour comprendre pourquoi une classe rendue diffère de notre aperçu par
 * défaut, cf. `live-style.ts` qui référence ces mêmes variables avec fallback). */
export default function ThemeVariablesSection() {
  const themeVariables = useDevPanelStore((s) => s.themeVariables)
  const runThemeScan = useDevPanelStore((s) => s.runThemeScan)
  const [filter, setFilter] = useState('')
  const [copiedName, setCopiedName] = useState<string | null>(null)

  useEffect(() => {
    runThemeScan()
  }, [runThemeScan])

  if (!themeVariables) return null

  const query = filter.trim().toLowerCase()
  const visible = query ? themeVariables.filter((v) => v.name.toLowerCase().includes(query)) : themeVariables

  async function copyVar(name: string) {
    await navigator.clipboard.writeText(`var(${name})`)
    setCopiedName(name)
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => setCopiedName(null), 1200)
  }

  return (
    <details className="devwind-custom-section">
      <summary>Thème détecté sur ce site ({themeVariables.length})</summary>
      {themeVariables.length > 0 && (
        <input
          type="text"
          className="devwind-theme-vars__filter"
          placeholder="Filtrer (ex. color-red, radius)…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      <div className="devwind-theme-vars__list">
        {visible.map((v) => (
          <button
            key={v.name}
            type="button"
            className="devwind-theme-vars__row"
            title={`Copier var(${v.name})`}
            onClick={() => void copyVar(v.name)}
          >
            {v.name.startsWith('--color-') && <span className="devwind-value__swatch" style={{ background: v.value }} />}
            <span className="devwind-theme-vars__name">{v.name}</span>
            <span className="devwind-theme-vars__value">{copiedName === v.name ? 'copié !' : v.value}</span>
          </button>
        ))}
        {themeVariables.length === 0 && (
          <p className="devwind-empty">Aucune variable de thème v4 détectée (le site n'utilise peut-être pas Tailwind v4, ou son thème n'est pas exposé en variables CSS).</p>
        )}
      </div>
    </details>
  )
}
