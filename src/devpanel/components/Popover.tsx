import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface PopoverProps {
  label: ReactNode
  triggerClassName?: string
  children: (close: () => void) => ReactNode
}

/**
 * Popover ancré en CSS (position: relative sur le wrapper, absolute sur le contenu) : pas de
 * calcul de position en JS, le devpanel est une page normale (pas de Shadow DOM à gérer ici).
 */
export default function Popover({ label, triggerClassName, children }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="devwind-popover" ref={rootRef}>
      <button
        type="button"
        className={`devwind-popover__trigger${triggerClassName ? ` ${triggerClassName}` : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </button>
      {open && <div className="devwind-popover__content">{children(() => setOpen(false))}</div>}
    </div>
  )
}
