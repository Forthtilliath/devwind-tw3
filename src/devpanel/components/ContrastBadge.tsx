import { rateContrast } from '../../core/contrast'
import { useT } from '../i18n/useT'

interface ContrastBadgeProps {
  foreground: string
  /** Pile de fonds, le plus proche du texte en premier (composée sur blanc). */
  backgrounds: string[]
  fontSize?: number
  bold?: boolean
  /** Fond non réductible à des couleurs unies (dégradé, image, opacité…) : ratio estimé. */
  approximate?: boolean
  /** Version compacte (liste de valeurs d'un popover) : juste le ratio, pas le libellé AA/AAA. */
  compact?: boolean
}

/** Ratio de contraste WCAG entre deux couleurs, avec verdict AA/AAA. `null` si une des
 * couleurs n'a pas pu être analysée (ex. reçue avant que le content script ait répondu). */
export default function ContrastBadge({ foreground, backgrounds, fontSize = 16, bold = false, approximate = false, compact }: ContrastBadgeProps) {
  const t = useT()
  const rating = rateContrast(foreground, backgrounds, fontSize, bold)
  if (!rating) return null

  const passes = rating.aa
  const prefix = approximate ? '≈' : ''
  const label = compact ? `${prefix}${rating.ratio.toFixed(1)}:1` : `${prefix}${rating.ratio.toFixed(2)}:1 ${rating.aaa ? 'AAA' : rating.aa ? 'AA' : '✗'}`
  const title = t('contrast.title', {
    ratio: rating.ratio.toFixed(2),
    size: rating.isLargeText ? t('contrast.largeText') : t('contrast.normalText'),
    aa: rating.aa ? '✓' : '✗',
    aaa: rating.aaa ? '✓' : '✗',
  })

  return (
    <span
      className={`devwind-contrast${passes ? ' devwind-contrast--pass' : ' devwind-contrast--fail'}${compact ? ' devwind-contrast--compact' : ''}`}
      title={approximate ? `${title}${t('contrast.approximate')}` : title}
    >
      {label}
    </span>
  )
}
