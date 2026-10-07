// Une couche de surbrillance façon DevTools : marge (orange), padding (vert), cadre de la boîte
// et libellé avec ses dimensions. Implémentation impérative (le survol est un chemin chaud) et
// styles inline (pas de feuille à charger). Marge et padding sont dessinés par des bordures
// dont l'épaisseur vaut celle de la zone : aucun calcul de sous-rectangles.

export type HighlightKind = 'hover' | 'selection'

interface Palette {
  frame: string
  content: string
  padding: string
  margin: string
  label: string
}

// Survol en pointillé et zones plus claires, sélection en trait plein : on distingue d'un coup
// d'œil l'élément édité de celui qu'on s'apprête à cliquer.
const PALETTES: Record<HighlightKind, Palette> = {
  hover: {
    frame: '1px dashed #6366f1',
    content: 'rgba(99, 102, 241, 0.10)',
    padding: 'rgba(147, 196, 125, 0.30)',
    margin: 'rgba(246, 178, 107, 0.30)',
    label: '#4f46e5',
  },
  selection: {
    frame: '2px solid #6366f1',
    content: 'rgba(99, 102, 241, 0.14)',
    padding: 'rgba(147, 196, 125, 0.45)',
    margin: 'rgba(246, 178, 107, 0.45)',
    label: '#6366f1',
  },
}

const BASE = ['position: fixed', 'pointer-events: none', 'z-index: 2147483647', 'box-sizing: border-box', 'display: none']
const LABEL_GAP = 4
const LABEL_HEIGHT = 20

export interface BoxHighlight {
  show(el: Element, text: string): void
  hide(): void
}

function layer(container: ShadowRoot, extra: string[]): HTMLDivElement {
  const div = document.createElement('div')
  div.style.cssText = [...BASE, ...extra].join(';')
  container.appendChild(div)
  return div
}

function px(value: string): number {
  return Math.max(0, Number.parseFloat(value) || 0)
}

function place(div: HTMLElement, top: number, left: number, width: number, height: number) {
  div.style.display = 'block'
  div.style.top = `${top}px`
  div.style.left = `${left}px`
  div.style.width = `${Math.max(0, width)}px`
  div.style.height = `${Math.max(0, height)}px`
}

function formatSize(n: number): string {
  return String(Math.round(n * 10) / 10)
}

export function createBoxHighlight(container: ShadowRoot, kind: HighlightKind): BoxHighlight {
  const palette = PALETTES[kind]
  const margin = layer(container, ['border-style: solid', `border-color: ${palette.margin}`])
  const padding = layer(container, ['border-style: solid', `border-color: ${palette.padding}`, `background: ${palette.content}`])
  const frame = layer(container, [`border: ${palette.frame}`])
  const label = layer(container, [
    `background: ${palette.label}`,
    'color: white',
    'font: 11px/1.4 system-ui, sans-serif',
    'padding: 2px 6px',
    'border-radius: 4px',
    'white-space: nowrap',
  ])
  const parts = [margin, padding, frame, label]

  return {
    show(el, text) {
      const rect = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      const m = [px(cs.marginTop), px(cs.marginRight), px(cs.marginBottom), px(cs.marginLeft)]
      const b = [px(cs.borderTopWidth), px(cs.borderRightWidth), px(cs.borderBottomWidth), px(cs.borderLeftWidth)]
      const p = [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)]

      place(margin, rect.top - m[0], rect.left - m[3], rect.width + m[1] + m[3], rect.height + m[0] + m[2])
      margin.style.borderWidth = m.map((v) => `${v}px`).join(' ')
      place(padding, rect.top + b[0], rect.left + b[3], rect.width - b[1] - b[3], rect.height - b[0] - b[2])
      padding.style.borderWidth = p.map((v) => `${v}px`).join(' ')
      place(frame, rect.top, rect.left, rect.width, rect.height)

      label.textContent = `${text} · ${formatSize(rect.width)}×${formatSize(rect.height)}`
      label.style.display = 'block'
      // Au-dessus de l'élément s'il y a la place, sinon en dessous, sinon à l'intérieur ; jamais
      // au-delà du bord droit de la fenêtre (élément collé à droite ou plus large que l'écran).
      const top =
        rect.top >= LABEL_HEIGHT + LABEL_GAP
          ? rect.top - LABEL_HEIGHT - LABEL_GAP / 2
          : rect.bottom + LABEL_HEIGHT + LABEL_GAP <= window.innerHeight
            ? rect.bottom + LABEL_GAP / 2
            : Math.max(rect.top, 0) + LABEL_GAP / 2
      const maxLeft = window.innerWidth - label.offsetWidth - LABEL_GAP
      label.style.top = `${top}px`
      label.style.left = `${Math.max(LABEL_GAP, Math.min(rect.left, maxLeft))}px`
    },
    hide() {
      for (const part of parts) part.style.display = 'none'
    },
  }
}
