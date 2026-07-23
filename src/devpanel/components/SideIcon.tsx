type Side = 'all' | 'x' | 'y' | 't' | 'r' | 'b' | 'l' | 'tl' | 'tr' | 'br' | 'bl'

/** Préfixe complet -> côté représenté, pour toutes les entrées à préfixes multiples de la
 * taxonomie (padding/margin utilisent un suffixe collé — `pt` — contrairement à
 * border/rounded/gap/translate/skew/scale qui utilisent un tiret — `border-t`, `rounded-tl`). */
const PREFIX_TO_SIDE: Record<string, Side> = {
  p: 'all',
  pt: 't',
  pr: 'r',
  pb: 'b',
  pl: 'l',
  px: 'x',
  py: 'y',
  m: 'all',
  mt: 't',
  mr: 'r',
  mb: 'b',
  ml: 'l',
  mx: 'x',
  my: 'y',
  gap: 'all',
  'gap-x': 'x',
  'gap-y': 'y',
  border: 'all',
  'border-t': 't',
  'border-r': 'r',
  'border-b': 'b',
  'border-l': 'l',
  'border-x': 'x',
  'border-y': 'y',
  rounded: 'all',
  'rounded-t': 't',
  'rounded-r': 'r',
  'rounded-b': 'b',
  'rounded-l': 'l',
  'rounded-tl': 'tl',
  'rounded-tr': 'tr',
  'rounded-br': 'br',
  'rounded-bl': 'bl',
  scale: 'all',
  'scale-x': 'x',
  'scale-y': 'y',
  'translate-x': 'x',
  'translate-y': 'y',
  'skew-x': 'x',
  'skew-y': 'y',
}

const ACTIVE = 'currentColor'
const DIM = 'currentColor'
const DIM_OPACITY = 0.35

export function hasSideIcon(prefix: string): boolean {
  return prefix in PREFIX_TO_SIDE
}

interface SideIconProps {
  prefix: string
}

/** Icône 14×14 représentant visuellement quel côté un préfixe affecte (carré avec le ou les
 * bords/coins concernés en surbrillance) — remplace le texte brut (`p`, `px`, `pt`...).
 * Retourne `null` pour un préfixe non cartographié : l'appelant retombe sur le texte. */
export default function SideIcon({ prefix }: SideIconProps) {
  const side = PREFIX_TO_SIDE[prefix]
  if (!side) return null

  const edge = (on: boolean) => ({ stroke: ACTIVE, strokeOpacity: on ? 1 : DIM_OPACITY, strokeWidth: on ? 2 : 1 })

  if (side === 'all') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <rect x="2" y="2" width="10" height="10" fill="none" stroke={ACTIVE} strokeWidth="2" />
      </svg>
    )
  }

  if (side === 'tl' || side === 'tr' || side === 'br' || side === 'bl') {
    const cx = side.includes('l') ? 3 : 11
    const cy = side.includes('t') ? 3 : 11
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <rect x="2" y="2" width="10" height="10" fill="none" stroke={DIM} strokeOpacity={DIM_OPACITY} strokeWidth="1" />
        <circle cx={cx} cy={cy} r="2.5" fill={ACTIVE} />
      </svg>
    )
  }

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="2" y="2" width="10" height="10" fill="none" stroke={DIM} strokeOpacity={DIM_OPACITY} strokeWidth="1" />
      {(side === 'l' || side === 'x') && <line x1="2" y1="1" x2="2" y2="13" {...edge(true)} />}
      {(side === 'r' || side === 'x') && <line x1="12" y1="1" x2="12" y2="13" {...edge(true)} />}
      {(side === 't' || side === 'y') && <line x1="1" y1="2" x2="13" y2="2" {...edge(true)} />}
      {(side === 'b' || side === 'y') && <line x1="1" y1="12" x2="13" y2="12" {...edge(true)} />}
    </svg>
  )
}
