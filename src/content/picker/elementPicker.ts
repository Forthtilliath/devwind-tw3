import { createBoxHighlight } from './box-highlight'
import { readClassList } from '../../core/class-attr'

const PRESS_EVENTS = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'dblclick'] as const

export interface ElementPickerOptions {
  shadowRoot: ShadowRoot
  host: Element
  onSelect: (el: Element) => void
  /** Échap pendant le picking : laisse l'appelant décider de la réaction (verrouiller la
   * sélection courante, cf. main.ts) — le picker se contente de masquer son survol. */
  onEscape?: () => void
}

export interface ElementPicker {
  start(): void
  stop(): void
  /** Affiche (ou masque, `null`) la surbrillance de la sélection, distincte de celle du survol
   * et indépendante du picking : elle reste visible en mode verrouillé, suit le défilement et
   * les changements de taille de l'élément (édition de classes, aperçu au survol). */
  showSelection(el: Element | null): void
}

/** Libellé court affiché sur la surbrillance (tag + première classe). À ne pas confondre avec
 * `shortElementLabel` (historique), volontairement indépendant des classes. */
function overlayLabel(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const classes = readClassList(el)
  return classes.length ? `${tag}.${classes[0]}${classes.length > 1 ? ` +${classes.length - 1}` : ''}` : tag
}

/**
 * Picking continu (comme les DevTools "inspect element") : tant que le picker est actif,
 * chaque clic sur la page sélectionne l'élément visé (au lieu de laisser passer le clic
 * normalement) et met à jour le panneau. Arrêté à la fermeture du panneau ou au verrouillage
 * de la sélection (cf. main.ts).
 */
export function createElementPicker({ shadowRoot, host, onSelect, onEscape }: ElementPickerOptions): ElementPicker {
  const hoverBox = createBoxHighlight(shadowRoot, 'hover')
  const selectionBox = createBoxHighlight(shadowRoot, 'selection')
  let active = false
  let rafId: number | null = null
  let lastHovered: Element | null = null
  let selected: Element | null = null
  const resizeObserver = new ResizeObserver(() => scheduleUpdate())

  function update() {
    rafId = null
    if (selected?.isConnected) selectionBox.show(selected, overlayLabel(selected))
    else selectionBox.hide()
    // Survoler l'élément déjà sélectionné : sa surbrillance de sélection suffit.
    if (active && lastHovered?.isConnected && lastHovered !== selected) hoverBox.show(lastHovered, overlayLabel(lastHovered))
    else hoverBox.hide()
  }

  function scheduleUpdate() {
    if (rafId != null) return
    rafId = requestAnimationFrame(update)
  }

  // Élément réellement visé, y compris à l'intérieur d'un Shadow DOM de la page (web
  // component) : `e.target` est retargeté vers l'hôte du shadow root, `composedPath()[0]` non.
  // `null` si l'événement provient de notre propre UI (le chemin traverse alors `host`).
  function pageTarget(e: Event): Element | null {
    const path = e.composedPath()
    if (path.includes(host)) return null
    const first = path[0]
    return first instanceof Element ? first : null
  }

  function onMouseMove(e: MouseEvent) {
    lastHovered = pageTarget(e)
    scheduleUpdate()
  }

  function swallow(e: Event) {
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
  }

  function onClick(e: MouseEvent) {
    const target = pageTarget(e)
    if (!target) return // clic dans notre propre UI : comportement normal
    swallow(e)
    onSelect(target)
  }

  // Bloquer seulement `click` laissait passer les autres événements du geste (dropdowns qui
  // s'ouvrent au mousedown, drag, liens en mousedown...) : on les avale aussi pendant le picking.
  function onPressEvent(e: Event) {
    if (pageTarget(e)) swallow(e)
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      lastHovered = null
      scheduleUpdate()
      onEscape?.()
    }
  }

  // Défilement/redimensionnement : écoutés tant qu'il y a quelque chose à suivre (picking actif
  // OU sélection affichée, y compris verrouillée).
  let tracking = false
  function syncTracking() {
    const shouldTrack = active || selected != null
    if (shouldTrack === tracking) return
    tracking = shouldTrack
    if (tracking) {
      window.addEventListener('scroll', scheduleUpdate, true)
      window.addEventListener('resize', scheduleUpdate)
    } else {
      window.removeEventListener('scroll', scheduleUpdate, true)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }

  return {
    showSelection(el) {
      if (el !== selected) {
        resizeObserver.disconnect()
        if (el) resizeObserver.observe(el)
        selected = el
        syncTracking()
      }
      scheduleUpdate()
    },
    start() {
      if (active) return
      active = true
      document.addEventListener('mousemove', onMouseMove, true)
      document.addEventListener('click', onClick, true)
      for (const type of PRESS_EVENTS) document.addEventListener(type, onPressEvent, true)
      document.addEventListener('keydown', onKeyDown, true)
      syncTracking()
    },
    stop() {
      if (!active) return
      active = false
      document.removeEventListener('mousemove', onMouseMove, true)
      document.removeEventListener('click', onClick, true)
      for (const type of PRESS_EVENTS) document.removeEventListener(type, onPressEvent, true)
      document.removeEventListener('keydown', onKeyDown, true)
      lastHovered = null
      syncTracking()
      scheduleUpdate()
    },
  }
}
