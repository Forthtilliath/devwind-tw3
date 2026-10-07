import type { PickerState } from '../types'

// Chemin de sortie stable configuré dans vite.content.config.ts : à garder synchronisé.
const CONTENT_SCRIPT_FILE = 'content/main.js'
const DEVPANEL_PATH = 'src/devpanel/devpanel.html'
const BOUNDS_STORAGE_KEY = 'devwind-window-bounds'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pingContentScript(tabId: number): Promise<PickerState | undefined> {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: 'DEVWIND_PING' })
  } catch {
    // Pas de listener côté content script (pas encore injecté dans cet onglet).
    return undefined
  }
}

/**
 * Injecte le content script si besoin (idempotent) et attend qu'il réponde à un ping avant
 * de continuer. `mount()` côté content script est synchrone (plus de fetch au montage), donc
 * son listener de messages est enregistré avant même que `executeScript` ne résolve — mais on
 * garde un court retry en filet de sécurité plutôt que de supposer cette garantie à 100 %.
 */
async function ensureContentScriptReady(tabId: number): Promise<boolean> {
  if (await pingContentScript(tabId)) return true
  await chrome.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT_FILE] })
  for (let attempt = 0; attempt < 5; attempt++) {
    if (await pingContentScript(tabId)) return true
    await sleep(60)
  }
  return false
}

async function setPickerActive(tabId: number, active: boolean): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'DEVWIND_SET_ACTIVE', active })
  } catch {
    // L'onglet a pu se fermer entre-temps : rien à faire.
  }
}

interface DevPanelLocation {
  windowId: number
  /** Onglet de la fenêtre devpanel elle-même (pas l'onglet de la page éditée). */
  panelTabId: number
}

/** Retrouve la fenêtre devpanel déjà ouverte pour cet onglet, s'il y en a une. */
async function findDevPanel(tabId: number): Promise<DevPanelLocation | null> {
  const tabs = await chrome.tabs.query({ url: `${chrome.runtime.getURL(DEVPANEL_PATH)}*` })
  for (const t of tabs) {
    if (!t.url || t.windowId == null || t.id == null) continue
    if (new URL(t.url).searchParams.get('tabId') === String(tabId)) return { windowId: t.windowId, panelTabId: t.id }
  }
  return null
}

interface WindowBounds {
  left?: number
  top?: number
  width?: number
  height?: number
}

const BOUND_KEYS = ['left', 'top', 'width', 'height'] as const
const MIN_WINDOW_SIZE = 200

/** Relit la position sauvegardée en ne gardant que des entiers plausibles : une valeur
 * corrompue ferait échouer `chrome.windows.create` (et donc l'ouverture du panneau). */
async function getSavedBounds(): Promise<WindowBounds> {
  const stored: unknown = (await chrome.storage.local.get(BOUNDS_STORAGE_KEY))[BOUNDS_STORAGE_KEY]
  if (typeof stored !== 'object' || stored === null) return {}
  const bounds: WindowBounds = {}
  for (const key of BOUND_KEYS) {
    const v = (stored as Record<string, unknown>)[key]
    if (typeof v !== 'number' || !Number.isFinite(v)) continue
    if ((key === 'width' || key === 'height') && v < MIN_WINDOW_SIZE) continue
    bounds[key] = Math.round(v)
  }
  return bounds
}

/** Appelé par la fenêtre devpanel elle-même (resize/blur) pour se souvenir de sa position. */
export async function saveWindowBounds(bounds: WindowBounds): Promise<void> {
  await chrome.storage.local.set({ [BOUNDS_STORAGE_KEY]: bounds })
}

/** Ouvre la fenêtre devpanel pour cet onglet (ou la focus si déjà ouverte), active le picker. */
export async function openDevPanel(tabId: number): Promise<void> {
  const ready = await ensureContentScriptReady(tabId)
  if (!ready) return
  await setPickerActive(tabId, true)

  const existing = await findDevPanel(tabId)
  if (existing != null) {
    await chrome.windows.update(existing.windowId, { focused: true })
    return
  }

  const bounds = await getSavedBounds()
  await chrome.windows.create({
    url: chrome.runtime.getURL(`${DEVPANEL_PATH}?tabId=${tabId}`),
    type: 'popup',
    width: bounds.width ?? 380,
    height: bounds.height ?? 680,
    left: bounds.left,
    top: bounds.top,
    focused: true,
  })
}

/**
 * Ferme la fenêtre devpanel de cet onglet. La fermeture coupe aussi le Port de sync côté
 * content script (voir src/content/sync.ts), qui arrête déjà le picker de lui-même : l'appel
 * explicite à setPickerActive ici est un filet de sécurité, pas le mécanisme principal.
 */
export async function closeDevPanel(tabId: number): Promise<void> {
  const existing = await findDevPanel(tabId)
  if (existing != null) await chrome.windows.remove(existing.windowId)
  await setPickerActive(tabId, false)
}

/**
 * Page rechargée/naviguée : le content script a disparu et la fenêtre devpanel affiche "Page
 * fermée". Plutôt que de fermer ce panneau mort (ce qui obligeait à cliquer deux fois), on
 * réinjecte le content script puis on recharge le panneau, qui se reconnecte au démarrage.
 */
async function reconnectDevPanel(tabId: number, panel: DevPanelLocation): Promise<void> {
  const ready = await ensureContentScriptReady(tabId)
  if (!ready) return
  await setPickerActive(tabId, true)
  await chrome.tabs.reload(panel.panelTabId)
  await chrome.windows.update(panel.windowId, { focused: true })
}

/**
 * Bouton "Reconnecter" du panneau : réinjecte le content script et réactive le picker. Échoue
 * (`false`) quand Chrome a révoqué `activeTab` à la navigation — seul un nouveau geste sur
 * l'icône (ou le raccourci) peut alors rendre l'accès à la page.
 */
export async function reinjectContentScript(tabId: number): Promise<boolean> {
  try {
    if (!(await ensureContentScriptReady(tabId))) return false
    await setPickerActive(tabId, true)
    return true
  } catch {
    return false
  }
}

/** Met l'onglet de la page au premier plan (et sa fenêtre), pour cliquer sur l'icône DevWind. */
export async function focusPageTab(tabId: number): Promise<void> {
  try {
    const tab = await chrome.tabs.update(tabId, { active: true })
    if (tab?.windowId != null) await chrome.windows.update(tab.windowId, { focused: true })
  } catch {
    // Onglet fermé entre-temps : rien à afficher.
  }
}

export async function toggleDevPanel(tabId: number): Promise<void> {
  const existing = await findDevPanel(tabId)
  if (existing == null) return openDevPanel(tabId)
  if (await pingContentScript(tabId)) return closeDevPanel(tabId)
  return reconnectDevPanel(tabId, existing)
}

/** Onglet de la page fermé : sa fenêtre devpanel n'a plus rien à éditer, on la ferme aussi. */
export async function closeDevPanelOfRemovedTab(tabId: number): Promise<void> {
  const existing = await findDevPanel(tabId)
  if (existing != null) await chrome.windows.remove(existing.windowId)
}
