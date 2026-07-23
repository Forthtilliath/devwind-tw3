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

/** Retrouve la fenêtre devpanel déjà ouverte pour cet onglet, s'il y en a une. */
async function findDevPanelWindowId(tabId: number): Promise<number | null> {
  const tabs = await chrome.tabs.query({ url: `${chrome.runtime.getURL(DEVPANEL_PATH)}*` })
  for (const t of tabs) {
    if (!t.url || t.windowId == null) continue
    if (new URL(t.url).searchParams.get('tabId') === String(tabId)) return t.windowId
  }
  return null
}

interface WindowBounds {
  left?: number
  top?: number
  width?: number
  height?: number
}

async function getSavedBounds(): Promise<WindowBounds> {
  const stored = await chrome.storage.local.get(BOUNDS_STORAGE_KEY)
  return (stored[BOUNDS_STORAGE_KEY] as WindowBounds | undefined) ?? {}
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

  const existing = await findDevPanelWindowId(tabId)
  if (existing != null) {
    await chrome.windows.update(existing, { focused: true })
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
  const existing = await findDevPanelWindowId(tabId)
  if (existing != null) await chrome.windows.remove(existing)
  await setPickerActive(tabId, false)
}

export async function toggleDevPanel(tabId: number): Promise<void> {
  const existing = await findDevPanelWindowId(tabId)
  if (existing != null) await closeDevPanel(tabId)
  else await openDevPanel(tabId)
}
