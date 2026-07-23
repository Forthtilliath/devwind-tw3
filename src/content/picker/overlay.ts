// Implémentation impérative (pas React) : le mousemove est un chemin chaud, on évite
// le coût d'un re-render React à chaque déplacement de souris. Styles posés en inline
// (pas de stylesheet externe à charger) : c'est un tout petit bout d'UI purement visuel.
export interface Overlay {
  show(rect: DOMRect, label: string): void
  hide(): void
  destroy(): void
}

export function createOverlay(container: ShadowRoot): Overlay {
  const box = document.createElement('div')
  box.style.cssText = [
    'position: fixed',
    'pointer-events: none',
    'z-index: 2147483647',
    'border: 2px solid #6366f1',
    'background: rgba(99, 102, 241, 0.15)',
    'box-sizing: border-box',
    'display: none',
  ].join(';')

  const label = document.createElement('div')
  label.style.cssText = [
    'position: fixed',
    'pointer-events: none',
    'z-index: 2147483647',
    'background: #6366f1',
    'color: white',
    "font: 11px/1.4 system-ui, sans-serif",
    'padding: 2px 6px',
    'border-radius: 4px',
    'white-space: nowrap',
    'display: none',
  ].join(';')

  container.appendChild(box)
  container.appendChild(label)

  return {
    show(rect, text) {
      box.style.display = 'block'
      box.style.top = `${rect.top}px`
      box.style.left = `${rect.left}px`
      box.style.width = `${rect.width}px`
      box.style.height = `${rect.height}px`

      label.style.display = 'block'
      label.textContent = text
      const labelTop = rect.top > 20 ? rect.top - 20 : rect.bottom + 2
      label.style.top = `${labelTop}px`
      label.style.left = `${rect.left}px`
    },
    hide() {
      box.style.display = 'none'
      label.style.display = 'none'
    },
    destroy() {
      box.remove()
      label.remove()
    },
  }
}
