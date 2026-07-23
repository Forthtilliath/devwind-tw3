import { createOverlay } from './overlay'

export interface ElementPickerOptions {
  shadowRoot: ShadowRoot
  host: Element
  onSelect: (el: Element) => void
  /** Échap pendant le picking : laisse l'appelant décider de la réaction (verrouiller la
   * sélection courante, cf. main.tsx) — le picker se contente de masquer son survol. */
  onEscape?: () => void
}

export interface ElementPicker {
  start(): void
  stop(): void
  /** Affiche/masque le rectangle de surbrillance sur un élément précis, indépendamment du
   * survol de la souris — utilisé pour la navigation clavier / le fil d'ariane des ancêtres,
   * qui changent la sélection sans mouvement de souris (marche même après `stop()`, donc
   * reste visible en mode verrouillé). */
  showSelection(el: Element | null): void
}

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const classes = el.className ? el.className.toString().trim().split(/\s+/).filter(Boolean) : []
  return classes.length ? `${tag}.${classes[0]}${classes.length > 1 ? ` +${classes.length - 1}` : ''}` : tag
}

/**
 * Picking continu (comme les DevTools "inspect element") : tant que le picker est actif,
 * chaque clic sur la page sélectionne l'élément visé (au lieu de laisser passer le clic
 * normalement) et met à jour le panneau. Désactivé uniquement via le toggle du popup.
 */
export function createElementPicker({ shadowRoot, host, onSelect, onEscape }: ElementPickerOptions): ElementPicker {
  const overlay = createOverlay(shadowRoot)
  let active = false
  let rafId: number | null = null
  let lastHovered: Element | null = null

  function updateOverlayForLastHovered() {
    rafId = null
    if (lastHovered && lastHovered.isConnected) {
      overlay.show(lastHovered.getBoundingClientRect(), describeElement(lastHovered))
    } else {
      overlay.hide()
    }
  }

  function scheduleOverlayUpdate() {
    if (rafId != null) return
    rafId = requestAnimationFrame(updateOverlayForLastHovered)
  }

  // event.target est retargeté vers `host` par le navigateur quand l'événement provient
  // de l'intérieur de notre shadow root (ouvert) : ce check suffit à ignorer les
  // interactions avec notre propre UI, sans avoir besoin de elementFromPoint manuel.
  function isOwnUi(target: EventTarget | null): boolean {
    return !target || host.contains(target as Node)
  }

  function onMouseMove(e: MouseEvent) {
    const target = e.target as Element | null
    if (isOwnUi(target)) {
      lastHovered = null
      overlay.hide()
      return
    }
    lastHovered = target
    scheduleOverlayUpdate()
  }

  function onClick(e: MouseEvent) {
    const target = e.target as Element | null
    if (isOwnUi(target)) return // clic dans notre propre UI : comportement normal
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
    onSelect(target!)
  }

  function onScrollOrResize() {
    scheduleOverlayUpdate()
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      overlay.hide()
      lastHovered = null
      onEscape?.()
    }
  }

  return {
    showSelection(el) {
      if (el && el.isConnected) overlay.show(el.getBoundingClientRect(), describeElement(el))
      else overlay.hide()
    },
    start() {
      if (active) return
      active = true
      document.addEventListener('mousemove', onMouseMove, true)
      document.addEventListener('click', onClick, true)
      document.addEventListener('keydown', onKeyDown, true)
      window.addEventListener('scroll', onScrollOrResize, true)
      window.addEventListener('resize', onScrollOrResize)
    },
    stop() {
      if (!active) return
      active = false
      document.removeEventListener('mousemove', onMouseMove, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
      if (rafId != null) cancelAnimationFrame(rafId)
      overlay.hide()
      lastHovered = null
    },
  }
}
