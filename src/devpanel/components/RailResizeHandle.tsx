import { useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'

interface RailResizeHandleProps {
  width: number
  min: number
  max: number
  defaultWidth: number
  label: string
  title: string
  onResize: (width: number) => void
  /** Largeur finale à persister (fin de drag, touche clavier, réinitialisation). */
  onCommit: (width: number) => void
}

const KEY_STEP = 8
const KEY_STEP_LARGE = 32

/** Séparateur redimensionnable (pattern ARIA « window splitter ») : souris, tactile et stylet via
 * pointer events + capture, clavier via ←/→ (Maj = grand pas), Début/Fin, Entrée ou double-clic
 * pour revenir à la largeur par défaut. */
export default function RailResizeHandle({ width, min, max, defaultWidth, label, title, onResize, onCommit }: RailResizeHandleProps) {
  const [resizing, setResizing] = useState(false)
  const clamp = (w: number) => Math.min(max, Math.max(min, Math.round(w)))

  function setAndCommit(w: number) {
    const next = clamp(w)
    onResize(next)
    onCommit(next)
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.preventDefault()
    const handle = e.currentTarget
    const startX = e.clientX
    const startWidth = width
    let latest = width
    handle.setPointerCapture(e.pointerId)
    setResizing(true)

    function onPointerMove(ev: PointerEvent) {
      latest = clamp(startWidth + (ev.clientX - startX))
      onResize(latest)
    }
    function onPointerEnd() {
      handle.removeEventListener('pointermove', onPointerMove)
      handle.removeEventListener('pointerup', onPointerEnd)
      handle.removeEventListener('pointercancel', onPointerEnd)
      setResizing(false)
      onCommit(latest)
    }
    handle.addEventListener('pointermove', onPointerMove)
    handle.addEventListener('pointerup', onPointerEnd)
    handle.addEventListener('pointercancel', onPointerEnd)
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP
    const next: Record<string, number> = {
      ArrowLeft: width - step,
      ArrowRight: width + step,
      Home: min,
      End: max,
      Enter: defaultWidth,
    }
    if (!(e.key in next)) return
    // `preventDefault` signale aussi au raccourci global ←/→ (navigation entre éléments frères
    // de la page, cf. DevPanel) que la touche est consommée ici.
    e.preventDefault()
    setAndCommit(next[e.key])
  }

  return (
    <div
      className={`devwind-category-nav__resize-handle${resizing ? ' devwind-category-nav__resize-handle--active' : ''}`}
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={() => setAndCommit(defaultWidth)}
      title={title}
    />
  )
}
