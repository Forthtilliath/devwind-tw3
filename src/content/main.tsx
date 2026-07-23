import { mountShadowHost } from './shadow-mount'
import { createElementPicker } from './picker/elementPicker'
import { notifyLockedFromPage, selectElement, setupSync } from './sync'
import type { PickerMessage, PickerState } from '../types'

const HOST_ID = 'devwind-root-host'

function mount() {
  // Idempotent : si le popup ré-exécute le content script sur un onglet déjà monté
  // (double clic rapide, etc.), on ne remonte pas un second Shadow DOM.
  if (document.getElementById(HOST_ID)) return

  const { host, shadowRoot } = mountShadowHost(HOST_ID)

  let pickerActive = false
  let locked = false

  const picker = createElementPicker({
    shadowRoot,
    host,
    onSelect: (el) => selectElement(el),
    // Échap pendant le picking : verrouille la sélection courante (au lieu de la perdre), pour
    // pouvoir interagir normalement avec la page sans que le picker continue à réagir au
    // survol/clic — même effet que le bouton 🔒 du panneau, déclenché depuis la page.
    onEscape: () => {
      if (!pickerActive || locked) return
      locked = true
      picker.stop()
      notifyLockedFromPage(true)
    },
  })

  setupSync({
    onPortConnected: () => {
      // La fenêtre devpanel vient de se connecter : rien à faire de spécial ici, le picker
      // est démarré/arrêté via DEVWIND_SET_ACTIVE (déclenché par core/activation.ts au moment
      // de l'ouverture de la fenêtre), pas par la connexion du port elle-même.
    },
    onPortDisconnected: () => {
      // Fenêtre devpanel fermée : plus personne pour éditer, on arrête le picker.
      pickerActive = false
      locked = false
      picker.stop()
    },
    onSelectionChanged: (el) => picker.showSelection(el),
    onSetLocked: (nextLocked) => {
      // Verrouillé : on suspend le picking (survol/clic) pour laisser l'utilisateur interagir
      // normalement avec la page — la sélection courante reste visible (showSelection marche
      // indépendamment de start()/stop()) et reste modifiable via le fil d'ariane / le clavier
      // côté devpanel. Déverrouillé : on reprend le picking si la session est toujours active.
      locked = nextLocked
      if (locked) picker.stop()
      else if (pickerActive) picker.start()
    },
  })

  chrome.runtime.onMessage.addListener((message: PickerMessage, _sender, sendResponse) => {
    const state = (): PickerState => ({ active: pickerActive })

    switch (message.type) {
      case 'DEVWIND_PING':
      case 'DEVWIND_GET_STATE':
        sendResponse(state())
        return true
      case 'DEVWIND_SET_ACTIVE': {
        pickerActive = message.active
        if (!pickerActive) locked = false
        if (pickerActive && !locked) picker.start()
        else picker.stop()
        sendResponse(state())
        return true
      }
      default:
        return false
    }
  })
}

mount()
