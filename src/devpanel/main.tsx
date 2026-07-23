import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import DevPanel from './DevPanel'
import { useDevPanelStore } from './store/useDevPanelStore'
import { saveWindowBounds } from '../core/activation'
import { applyTheme, loadTheme } from './theme'
import './devpanel.css'

useDevPanelStore.getState().connect()

// Appliqué avant le premier rendu pour éviter un flash du thème par défaut (sombre).
void loadTheme().then(applyTheme)

// Sauvegarde légère de la position/taille de la fenêtre (debattue sur resize/blur) pour la
// réappliquer à la prochaine ouverture — sert le besoin "je la mets toujours sur mon 2e écran".
let boundsTimer: ReturnType<typeof setTimeout> | undefined
function schedulePersistBounds() {
  clearTimeout(boundsTimer)
  boundsTimer = setTimeout(() => {
    void chrome.windows.getCurrent().then((win) => {
      if (win.left == null || win.top == null || win.width == null || win.height == null) return
      void saveWindowBounds({ left: win.left, top: win.top, width: win.width, height: win.height })
    })
  }, 400)
}
window.addEventListener('resize', schedulePersistBounds)
window.addEventListener('blur', schedulePersistBounds)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DevPanel />
  </StrictMode>,
)
