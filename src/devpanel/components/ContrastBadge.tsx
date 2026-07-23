import { rateContrast } from '../../core/contrast'

interface ContrastBadgeProps {
  foreground: string
  background: string
  fontSize?: number
  bold?: boolean
  /** Version compacte (liste de valeurs d'un popover) : juste le ratio, pas le libellé AA/AAA. */
  compact?: boolean
}

/** Ratio de contraste WCAG entre deux couleurs, avec verdict AA/AAA. `null` si une des deux
 * couleurs n'a pas pu être analysée (ex. reçue avant que le content script ait répondu). */
export default function ContrastBadge({ foreground, background, fontSize = 16, bold = false, compact }: ContrastBadgeProps) {
  const rating = rateContrast(foreground, background, fontSize, bold)
  if (!rating) return null

  const passes = rating.aa
  const label = compact ? `${rating.ratio.toFixed(1)}:1` : `${rating.ratio.toFixed(2)}:1 ${rating.aaa ? 'AAA' : rating.aa ? 'AA' : '✗'}`

  return (
    <span
      className={`devwind-contrast${passes ? ' devwind-contrast--pass' : ' devwind-contrast--fail'}${compact ? ' devwind-contrast--compact' : ''}`}
      title={`Ratio ${rating.ratio.toFixed(2)}:1 (${rating.isLargeText ? 'texte large' : 'texte normal'}) — AA ${rating.aa ? '✓' : '✗'} · AAA ${rating.aaa ? '✓' : '✗'}`}
    >
      {label}
    </span>
  )
}
