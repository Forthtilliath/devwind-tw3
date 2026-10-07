import { create } from 'zustand'
import { DEVWIND_SYNC_PORT } from '../../types'
import { loadLanguage, NEXT_LANGUAGE, setLanguage as persistLanguage } from '../i18n'
import { getGeneratedClass } from '../data'
import { isSyncFromContent } from '../../core/message-guards'
import { planClassEdit } from '../../core/class-edit-plan'
import { buildLiveRule } from '../../core/live-style'
import { DEFAULT_BREAKPOINTS } from '../../core/breakpoints'
import { handleContentMessage } from './content-messages'
import { liveRulesFor, pickRedoTarget, pickUndoTarget, waitForFinalClasses } from './history'
import type { BreakpointMap } from '../../core/breakpoints'
import type { Language, MessageKey, MessageParams } from '../i18n'
import type {
  AncestorInfo,
  ChangeLogEntry,
  ClassChangeRequest,
  ClassEdit,
  CssScanResult,
  ElementClassesSnapshot,
  ElementColors,
  GeneratedClass,
  NavigateDirection,
  SyncFromPanel,
} from '../../types'

/** Onglet de la page éditée (`?tabId=` de l'URL du panneau), `null` si absent ou invalide. */
function readTargetTabId(): number | null {
  const raw = new URLSearchParams(window.location.search).get('tabId')
  const id = raw ? Number(raw) : NaN
  return Number.isInteger(id) ? id : null
}

// Le Port de sync est gardé hors du state React (comme `selectedEl` l'était côté content
// script) : ce n'est pas une donnée à re-render, juste un canal de communication.
let port: chrome.runtime.Port | null = null
/** Un aperçu au survol est en cours côté page (évite d'envoyer des annulations pour rien). */
let previewing = false
let noticeTimer: ReturnType<typeof setTimeout> | undefined

const RECENT_STORAGE_KEY = 'devwind-recent-classes'
const MAX_RECENT = 24
const NOTICE_MS = 5000

/** `invalid` : panneau ouvert sans onglet cible (URL sans `tabId`), rien à connecter. */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'invalid'

export interface Notice {
  key: MessageKey
  params?: MessageParams
}

export interface DevPanelState {
  connectionState: ConnectionState
  tabId: number | null
  tagName: string | null
  /** La sélection a été vidée parce que l'élément a disparu du DOM (re-rendu SPA). */
  selectionDetached: boolean
  activeClasses: string[]
  /** Du parent direct jusqu'à `<body>` : fil d'ariane pour remonter sans re-cliquer sur la page. */
  ancestors: AncestorInfo[]
  customScan: CssScanResult | null
  /** Préfixe de site détecté par heuristique (option `prefix` de Tailwind v3, collé au nom, cf.
   * core/site-prefix.ts) : informatif, affiché dans la section des classes custom. */
  sitePrefix: string | null
  /** Breakpoints effectifs (défauts v3 complétés/remplacés par ceux des media queries du site). */
  breakpoints: BreakpointMap
  search: string
  /** Contexte de variant courant (ex. ['md','hover']) : appliqué à toute nouvelle édition. */
  activeVariants: string[]
  /** Verrouillé : le picker ne réagit plus au survol/clic sur la page (on peut interagir avec
   * la page normalement), la sélection ne change plus que via le fil d'ariane / le clavier. */
  locked: boolean
  /** Classes appliquées cette session dont `live-style` n'a pas pu synthétiser d'effet visuel
   * (variant non géré, ex. `dark:` sans stratégie détectable) — nettoyé automatiquement dès
   * que la classe n'est plus dans `activeClasses` (retirée/remplacée). */
  unsupportedClasses: string[]
  /** Dernières valeurs choisies via un picker (pas les valeurs arbitraires), les plus récentes
   * en premier — persisté dans chrome.storage.local, partagé entre onglets/sessions. */
  recentClasses: GeneratedClass[]
  /** Couleurs effectives (texte/fond réels, `getComputedStyle`) de l'élément sélectionné —
   * sert au contrôle de contraste WCAG (cf. core/contrast.ts). */
  elementColors: ElementColors | null
  /** Historique de TOUTES les modifications de la session (pas juste l'élément courant),
   * le plus ancien en premier — cf. content/change-log.ts. */
  changeLog: ChangeLogEntry[]
  /** Langue de l'interface (cf. devpanel/i18n/). */
  language: Language
  /** Message temporaire (annulation refusée, export vide...), effacé tout seul. */
  notice: Notice | null

  connect: () => void
  applyChange: (request: ClassChangeRequest) => void
  /** Aperçu au survol d'une valeur (`null` : revenir à l'état réel). */
  previewChange: (request: ClassChangeRequest | null) => void
  removeClass: (rawClass: string) => void
  toggleClass: (rawClass: string) => void
  revertEntry: (id: number, undo: boolean) => void
  undo: () => void
  redo: () => void
  requestFinalClasses: () => Promise<ElementClassesSnapshot[]>
  runCssScan: () => void
  setSearch: (query: string) => void
  toggleVariant: (variant: string) => void
  resetVariants: () => void
  selectAncestor: (index: number) => void
  navigate: (direction: NavigateDirection) => void
  toggleLocked: () => void
  recordRecent: (item: GeneratedClass) => void
  clearChangeLog: () => void
  cycleLanguage: () => void
  showNotice: (key: MessageKey, params?: MessageParams) => void
  dismissNotice: () => void
}

/** Classes récentes relues depuis `chrome.storage` : persistées par une version précédente,
 * elles peuvent ne plus exister (ou plus avec les mêmes valeurs) après une mise à jour du
 * dataset. On ne garde que les noms encore connus, remplacés par l'entrée ACTUELLE du dataset. */
function revalidateRecent(stored: unknown): GeneratedClass[] {
  if (!Array.isArray(stored)) return []
  const result: GeneratedClass[] = []
  for (const item of stored) {
    const name = (item as { className?: unknown } | null)?.className
    const current = typeof name === 'string' ? getGeneratedClass(name) : undefined
    if (current && !result.includes(current)) result.push(current)
    if (result.length >= MAX_RECENT) break
  }
  return result
}

function send(message: SyncFromPanel) {
  port?.postMessage(message)
}

export const useDevPanelStore = create<DevPanelState>((set, get) => {
  // Diff (slot) et CSS de prévisualisation calculés ici, où sont la taxonomie et le dataset : la
  // page n'a plus qu'à appliquer (cf. content/sync.ts).
  function planEdit(request: ClassChangeRequest): ClassEdit {
    const { activeClasses, breakpoints } = get()
    const { remove, add } = planClassEdit(activeClasses, request)
    return { remove, add, liveRule: add ? buildLiveRule(add, breakpoints) : null }
  }

  return {
    connectionState: 'connecting',
    tabId: readTargetTabId(),
    tagName: null,
    selectionDetached: false,
    activeClasses: [],
    ancestors: [],
    customScan: null,
    sitePrefix: null,
    breakpoints: DEFAULT_BREAKPOINTS,
    search: '',
    activeVariants: [],
    locked: false,
    unsupportedClasses: [],
    recentClasses: [],
    elementColors: null,
    changeLog: [],
    language: 'fr',
    notice: null,

    connect: () => {
      if (port) return // déjà connecté (StrictMode peut monter deux fois en dev)
      void loadLanguage().then((language) => set({ language }))
      const tabId = get().tabId
      if (tabId === null) {
        set({ connectionState: 'invalid' })
        return
      }
      const p = chrome.tabs.connect(tabId, { name: DEVWIND_SYNC_PORT })
      port = p
      set({ connectionState: 'connected' })

      void chrome.storage.local.get(RECENT_STORAGE_KEY).then((stored) => {
        set({ recentClasses: revalidateRecent(stored[RECENT_STORAGE_KEY]) })
      })

      p.onMessage.addListener((raw: unknown) => {
        if (isSyncFromContent(raw)) handleContentMessage(raw, set, get)
      })

      p.onDisconnect.addListener(() => {
        port = null
        previewing = false
        set({ connectionState: 'disconnected' })
      })
    },

    applyChange: (request) => {
      previewing = false // la page annule l'aperçu avant d'appliquer
      send({ type: 'APPLY_CHANGE', edit: planEdit(request) })
    },
    previewChange: (request) => {
      if (request) {
        previewing = true
        send({ type: 'PREVIEW_CHANGE', edit: planEdit(request) })
      } else if (previewing) {
        previewing = false
        send({ type: 'CANCEL_PREVIEW' })
      }
    },
    removeClass: (rawClass) => send({ type: 'REMOVE_CLASS', rawClass }),
    toggleClass: (rawClass) => send({ type: 'TOGGLE_CLASS', rawClass }),
    revertEntry: (id, undo) => {
      const { changeLog, breakpoints } = get()
      const entry = changeLog.find((e) => e.id === id)
      if (!entry) return
      const restored = undo ? entry.removed : entry.added
      send({ type: 'REVERT_CHANGE', id, undo, liveRules: liveRulesFor(restored, breakpoints) })
    },
    undo: () => {
      const target = pickUndoTarget(get().changeLog)
      if (target) get().revertEntry(target.id, true)
      else get().showNotice('notice.nothingToUndo')
    },
    redo: () => {
      const target = pickRedoTarget(get().changeLog)
      if (target) get().revertEntry(target.id, false)
      else get().showNotice('notice.nothingToRedo')
    },
    requestFinalClasses: () => {
      if (!port) return Promise.resolve([])
      const result = waitForFinalClasses()
      send({ type: 'REQUEST_FINAL_CLASSES' })
      return result
    },
    runCssScan: () => {
      if (get().customScan) return
      send({ type: 'RUN_CSS_SCAN' })
    },
    setSearch: (query) => set({ search: query }),
    toggleVariant: (variant) =>
      set((s) => ({
        activeVariants: s.activeVariants.includes(variant)
          ? s.activeVariants.filter((v) => v !== variant)
          : [...s.activeVariants, variant],
      })),
    resetVariants: () => set({ activeVariants: [] }),
    selectAncestor: (index) => send({ type: 'SELECT_ANCESTOR', index }),
    navigate: (direction) => send({ type: 'NAVIGATE', direction }),
    toggleLocked: () => {
      const locked = !get().locked
      set({ locked })
      send({ type: 'SET_LOCKED', locked })
    },
    recordRecent: (item) => {
      const current = get().recentClasses.filter((c) => c.className !== item.className)
      const next = [item, ...current].slice(0, MAX_RECENT)
      set({ recentClasses: next })
      void chrome.storage.local.set({ [RECENT_STORAGE_KEY]: next })
    },
    clearChangeLog: () => send({ type: 'CLEAR_CHANGE_LOG' }),
    cycleLanguage: () => {
      const next = NEXT_LANGUAGE[get().language]
      set({ language: next })
      void persistLanguage(next)
    },
    showNotice: (key, params) => {
      clearTimeout(noticeTimer)
      set({ notice: { key, params } })
      noticeTimer = setTimeout(() => set({ notice: null }), NOTICE_MS)
    },
    dismissNotice: () => {
      clearTimeout(noticeTimer)
      set({ notice: null })
    },
  }
})
