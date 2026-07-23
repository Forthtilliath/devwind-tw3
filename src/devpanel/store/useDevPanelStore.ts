import { create } from 'zustand'
import { DEVWIND_SYNC_PORT } from '../../types'
import { loadLanguage, setLanguage as persistLanguage } from '../i18n'
import type { Language } from '../i18n'
import type { AncestorInfo, ChangeLogEntry, ClassChangeRequest, CssScanResult, ElementColors, GeneratedClass, NavigateDirection, SyncFromContent, SyncFromPanel, ThemeVariable } from '../../types'

function getTargetTabId(): number {
  const raw = new URLSearchParams(window.location.search).get('tabId')
  const id = raw ? Number(raw) : NaN
  if (Number.isNaN(id)) throw new Error("DevWind : paramètre 'tabId' manquant dans l'URL du panneau.")
  return id
}

// Le Port de sync est gardé hors du state React (comme `selectedEl` l'était côté content
// script) : ce n'est pas une donnée à re-render, juste un canal de communication.
let port: chrome.runtime.Port | null = null

const RECENT_STORAGE_KEY = 'devwind-recent-classes'
const MAX_RECENT = 24

export type ConnectionState = 'connecting' | 'connected' | 'disconnected'

interface DevPanelState {
  connectionState: ConnectionState
  tagName: string | null
  activeClasses: string[]
  /** Du parent direct jusqu'à `<body>` : fil d'ariane pour remonter sans re-cliquer sur la page. */
  ancestors: AncestorInfo[]
  customScan: CssScanResult | null
  /** Variables de thème v4 (`--color-*`, `--radius-*`...) réellement définies sur `:root` du
   * site — indépendant de l'édition de classes, juste un outil d'inspection du thème réel. */
  themeVariables: ThemeVariable[] | null
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
   * le plus ancien en premier — cf. content/sync.ts. */
  changeLog: ChangeLogEntry[]
  /** Langue des libellés de catégorie/sous-catégorie (cf. devpanel/i18n.ts) — `taxonomy.ts`
   * mélangeait français et anglais selon l'entrée, ce réglage uniformise l'affichage. */
  language: Language

  connect: () => void
  applyChange: (request: ClassChangeRequest) => void
  removeClass: (rawClass: string) => void
  toggleClass: (rawClass: string) => void
  runCssScan: () => void
  runThemeScan: () => void
  setSearch: (query: string) => void
  toggleVariant: (variant: string) => void
  selectAncestor: (index: number) => void
  navigate: (direction: NavigateDirection) => void
  toggleLocked: () => void
  recordRecent: (item: GeneratedClass) => void
  clearChangeLog: () => void
  cycleLanguage: () => void
}

function send(message: SyncFromPanel) {
  port?.postMessage(message)
}

export const useDevPanelStore = create<DevPanelState>((set, get) => ({
  connectionState: 'connecting',
  tagName: null,
  activeClasses: [],
  ancestors: [],
  customScan: null,
  themeVariables: null,
  search: '',
  activeVariants: [],
  locked: false,
  unsupportedClasses: [],
  recentClasses: [],
  elementColors: null,
  changeLog: [],
  language: 'fr',

  connect: () => {
    if (port) return // déjà connecté (StrictMode peut monter deux fois en dev)
    const p = chrome.tabs.connect(getTargetTabId(), { name: DEVWIND_SYNC_PORT })
    port = p
    set({ connectionState: 'connected' })

    void chrome.storage.local.get(RECENT_STORAGE_KEY).then((stored) => {
      const recent = stored[RECENT_STORAGE_KEY]
      if (Array.isArray(recent)) set({ recentClasses: recent as GeneratedClass[] })
    })

    void loadLanguage().then((language) => set({ language }))

    p.onMessage.addListener((message: SyncFromContent) => {
      switch (message.type) {
        case 'ELEMENT_SELECTED':
          set({
            tagName: message.tagName,
            activeClasses: message.classes,
            ancestors: message.ancestors,
            unsupportedClasses: [],
            elementColors: message.colors,
          })
          return
        case 'ELEMENT_CLEARED':
          set({ tagName: null, activeClasses: [], ancestors: [], unsupportedClasses: [], elementColors: null })
          return
        case 'CLASSES_UPDATED':
          set((s) => {
            const kept = s.unsupportedClasses.filter((c) => message.classes.includes(c))
            if (message.unsupportedClass && !kept.includes(message.unsupportedClass)) kept.push(message.unsupportedClass)
            return { activeClasses: message.classes, unsupportedClasses: kept, elementColors: message.colors }
          })
          return
        case 'CUSTOM_SCAN_RESULT':
          set({ customScan: { found: new Map(message.found), unscannable: message.unscannable, detectedPrefix: message.detectedPrefix } })
          return
        case 'THEME_SCAN_RESULT':
          set({ themeVariables: message.variables })
          return
        case 'CHANGE_LOG_UPDATED':
          set({ changeLog: message.entries })
          return
        case 'LOCKED_CHANGED':
          // Verrouillage déclenché depuis la page (Échap sur le picker), pas depuis le bouton
          // du panneau : rien à renvoyer à la page (déjà fait côté content script), juste
          // refléter l'état pour que l'icône 🔒/🔓 reste synchronisée.
          set({ locked: message.locked })
          return
      }
    })

    p.onDisconnect.addListener(() => {
      port = null
      set({ connectionState: 'disconnected' })
    })
  },

  applyChange: (request) => send({ type: 'APPLY_CHANGE', request }),
  removeClass: (rawClass) => send({ type: 'REMOVE_CLASS', rawClass }),
  toggleClass: (rawClass) => send({ type: 'TOGGLE_CLASS', rawClass }),
  runCssScan: () => {
    if (get().customScan) return
    send({ type: 'RUN_CSS_SCAN' })
  },
  runThemeScan: () => {
    if (get().themeVariables) return
    send({ type: 'RUN_THEME_SCAN' })
  },
  setSearch: (query) => set({ search: query }),
  toggleVariant: (variant) =>
    set((s) => ({
      activeVariants: s.activeVariants.includes(variant)
        ? s.activeVariants.filter((v) => v !== variant)
        : [...s.activeVariants, variant],
    })),
  selectAncestor: (index) => send({ type: 'SELECT_ANCESTOR', index }),
  navigate: (direction) => send({ type: 'NAVIGATE', direction }),
  toggleLocked: () =>
    set((s) => {
      const locked = !s.locked
      send({ type: 'SET_LOCKED', locked })
      return { locked }
    }),
  recordRecent: (item) => {
    const current = get().recentClasses.filter((c) => c.className !== item.className)
    const next = [item, ...current].slice(0, MAX_RECENT)
    set({ recentClasses: next })
    void chrome.storage.local.set({ [RECENT_STORAGE_KEY]: next })
  },
  clearChangeLog: () => send({ type: 'CLEAR_CHANGE_LOG' }),
  cycleLanguage: () => {
    const next = get().language === 'fr' ? 'en' : 'fr'
    set({ language: next })
    void persistLanguage(next)
  },
}))
