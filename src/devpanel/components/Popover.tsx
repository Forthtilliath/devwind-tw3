import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface PopoverProps {
  label: ReactNode
  /** Nom accessible du déclencheur, obligatoire quand `label` n'est pas un texte parlant
   * (emoji, valeur seule…). Sert aussi de nom au dialogue ouvert. */
  ariaLabel?: string
  title?: string
  triggerClassName?: string
  children: (close: () => void) => ReactNode
}

const FOCUSABLE = 'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Popover ancré en CSS (position: relative sur le wrapper, absolute sur le contenu) : pas de
 * calcul de position en JS, le devpanel est une page normale (pas de Shadow DOM à gérer ici).
 * Exposé comme un dialogue non modal : focus déplacé dans le contenu à l'ouverture, rendu au
 * déclencheur à la fermeture (Échap ou choix d'une valeur), fermé si le focus sort au Tab.
 */
export default function Popover({ label, ariaLabel, title, triggerClassName, children }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const contentId = useId()

  function closeAndRestoreFocus() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    // `autoFocus` d'un enfant (ex. recherche de ValuePickerList) a déjà placé le focus : ne pas l'écraser.
    const content = contentRef.current
    if (content && !content.contains(document.activeElement)) {
      const first = content.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? content).focus()
    }

    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeAndRestoreFocus()
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div
      className="devwind-popover"
      ref={rootRef}
      onBlur={(e) => {
        // `relatedTarget` null = clic dans une zone non focusable ou sortie de la fenêtre : géré
        // par le mousedown extérieur, sinon on fermerait sur un simple clic dans le contenu.
        const next = e.relatedTarget as Node | null
        if (open && next && !rootRef.current?.contains(next)) setOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`devwind-popover__trigger${triggerClassName ? ` ${triggerClassName}` : ''}`}
        aria-label={ariaLabel}
        title={title}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? contentId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </button>
      {open && (
        <div
          ref={contentRef}
          id={contentId}
          className="devwind-popover__content"
          role="dialog"
          aria-label={ariaLabel}
          tabIndex={-1}
        >
          {children(closeAndRestoreFocus)}
        </div>
      )}
    </div>
  )
}
