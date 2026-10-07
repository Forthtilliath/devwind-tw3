// Protocole de messages entre le service worker (core/activation.ts) et le content script.
export type PickerMessage =
  | { type: 'DEVWIND_PING' }
  | { type: 'DEVWIND_SET_ACTIVE'; active: boolean }

export interface PickerState {
  active: boolean
}

// --- Taxonomie Tailwind ---

export type TaxonomyValueType = 'scale' | 'color' | 'static' | 'boolean'

export interface TaxonomyEntry {
  id: string
  category: string
  subcategory?: string
  /** préfixe de classe -> propriétés CSS affectées (pour affichage/documentation) */
  cssProperties: Record<string, string[]>
  prefixes: string[]
  themeKey: string | null
  type: TaxonomyValueType
  staticValues?: string[]
  /** `type: 'static'` uniquement : traduit un suffixe de classe vers sa vraie valeur CSS
   * quand ils diffèrent (ex. `resize-x` → `horizontal`). Absent = suffixe utilisé tel quel. */
  staticValueMap?: Record<string, string>
  supportsArbitrary: boolean
  supportsNegative: boolean
}

export interface GeneratedClass {
  className: string
  taxonomyId: string
  /** préfixe utilisé pour générer cette classe (ex. 'px' pour `px-4`, '' pour `flex`) */
  prefix: string
  category: string
  subcategory?: string
  themeKey: string | null
  themeToken: string | null
  /** fontSize uniquement : line-height apparié (`[taille, {lineHeight}]` dans le thème Tailwind). */
  secondaryValue: string | null
  negative: boolean
}

// --- Parsing / diff de classes ---

export interface ParsedClass {
  raw: string
  variants: string[]
  base: string
}

export interface ClassChangeRequest {
  /** id de l'entrée taxonomy.ts concernée (ex. 'padding') */
  taxonomyId: string
  /** préfixe exact concerné (ex. 'pt' pour padding-top, '' si l'entrée n'en a qu'un) — les
   * entrées à préfixes multiples (padding/margin/gap) ont un slot par côté, pas un slot
   * global pour toute l'entrée : changer `pt-8` ne doit pas retirer `px-3`. */
  prefix: string
  /** contexte de variant courant (ex. ['md','hover']), [] pour la classe de base */
  variants: string[]
  /** nouvelle classe de base à appliquer (ex. 'bg-red-500'), ou null pour retirer le slot */
  newBase: string | null
}

export interface ClassChangeResult {
  before: string
  after: string
}

/** CSS synthétisé par le panneau pour prévisualiser une classe absente du CSS du site (cf.
 * core/live-style.ts). Sans `dark:`, une seule règle ; avec `dark:`, `[règle media, règle
 * classe]`, que la page ordonne selon la stratégie dark réellement active. */
export interface LiveRule {
  rules: string[]
  dark: boolean
}

/** Édition calculée par le panneau (taxonomie + dataset), appliquée telle quelle par la page. */
export interface ClassEdit {
  /** Classes brutes du même slot que la nouvelle, à retirer. */
  remove: string[]
  /** Classe complète (variants compris) à ajouter, ou null pour seulement vider le slot. */
  add: string | null
  /** CSS à injecter si le site ne définit pas déjà `add` ; null = rien de synthétisable. */
  liveRule: LiveRule | null
}

// --- Scan CSS ---

export interface CssScanResult {
  found: Map<string, string[]>
  unscannable: string[]
}

/** Candidat au préfixe de site (option `prefix` de v3, collé au nom : `tw-bg-red-500`) :
 * `[préfixe, reste, occurrences]`. La page découpe les classes, le panneau valide le reste
 * contre la taxonomie (cf. core/site-prefix.ts). */
export type PrefixCandidate = [string, string, number]

/** Media query de largeur du CSS du site et classes qu'elle contient (cf.
 * core/breakpoint-scanner.ts) : `[1er variant, 2e variant ou '', 'min'|'max', seuil, occurrences]`.
 * En v3, le préfixe de site est collé à l'utilitaire, jamais en variant : seul le 1er compte. */
export type BreakpointVote = [string, string, 'min' | 'max', string, number]

// --- Historique des modifications de la session (toute la page, pas juste l'élément courant) ---

export interface ChangeLogEntry {
  /** Numéro d'ordre croissant, partagé avec `undoneSeq` (cf. content/change-log.ts). */
  id: number
  timestamp: number
  /** Description courte de l'élément touché (ex. `button#target-btn`, `li:nth-of-type(2)`),
   * pour se repérer visuellement. */
  elementLabel: string
  /** Sélecteur CSS unique dans la page au moment du changement (jamais basé sur les classes,
   * puisque ce sont elles qui changent) : sert à l'export. */
  selector: string
  added: string[]
  removed: string[]
  /** Modification annulée : numéro d'ordre de l'annulation (rétablir au clavier = la plus
   * récente), absent si elle est appliquée. */
  undoneSeq?: number
}

/** Classes finales d'un élément modifié pendant la session (export "toutes les classes"). */
export interface ElementClassesSnapshot {
  selector: string
  classes: string[]
}

/** Annulation/rétablissement refusé : élément retiré de la page, ou classes modifiées depuis. */
export type RevertRejection = 'detached' | 'modified'

// --- Synchronisation content script <-> fenêtre devpanel (via chrome.runtime.Port) ---

export const DEVWIND_SYNC_PORT = 'devwind-sync'

/** Plafond de l'historique de session, appliqué à l'identique par la page et le panneau. */
export const MAX_CHANGE_LOG_ENTRIES = 300

/** Un ancêtre dans le fil d'ariane (cf. DevPanel), du parent direct jusqu'à `<body>`. */
export interface AncestorInfo {
  tagName: string
  id: string | null
  classes: string[]
}

/** Résultat de `ensureLiveRule` (content/live-injection.ts) : `has-real-rule` = le CSS du site définit
 * déjà cette classe (rien synthétisé) ; `synthesized` = injectée par nous ; `unsupported` =
 * ni l'un ni l'autre, la classe appliquée n'aura probablement aucun effet visuel (ex. `dark:`
 * sans stratégie détectable, variant non géré...). */
export type LiveRuleStatus = 'has-real-rule' | 'synthesized' | 'unsupported'

/** Couleurs effectives de l'élément sélectionné (`getComputedStyle`, dans n'importe quelle
 * syntaxe — `rgb()` ou `oklch()`/`lab()` selon le navigateur et l'origine de la couleur ;
 * `core/contrast.ts` sait convertir les deux). Sert au contrôle de contraste, qui compose
 * `backgroundColor` sur `backdrop` (puis sur blanc) pour obtenir le fond réellement visible. */
export interface ElementColors {
  color: string
  /** Fond propre de l'élément, éventuellement translucide ou `transparent`. */
  backgroundColor: string
  /** Fonds non transparents des ancêtres, le plus proche en premier, jusqu'au premier opaque. */
  backdrop: string[]
  /** Dégradé/image de fond, opacité, filtre ou mode de fusion rencontré : le ratio calculé sur
   * les seules couleurs de fond n'est qu'une estimation. */
  approximate: boolean
  fontSize: number
  bold: boolean
}

/** Messages envoyés par le content script vers la fenêtre devpanel connectée. */
export type SyncFromContent =
  | { type: 'ELEMENT_SELECTED'; tagName: string; classes: string[]; ancestors: AncestorInfo[]; colors: ElementColors }
  /** `detached` : l'élément a disparu du DOM (re-rendu SPA), pas une désélection volontaire. */
  | { type: 'ELEMENT_CLEARED'; detached?: boolean }
  | { type: 'CLASSES_UPDATED'; classes: string[]; unsupportedClass?: string | null; colors: ElementColors }
  /** Toutes les classes trouvées dans les feuilles de style (le panneau écarte les Tailwind),
   * et les breakpoints de leurs media queries. */
  | { type: 'CUSTOM_SCAN_RESULT'; found: [string, string[]][]; unscannable: string[]; breakpoints: BreakpointVote[] }
  | { type: 'PREFIX_CANDIDATES'; candidates: PrefixCandidate[] }
  /** Historique complet : à la connexion et après un vidage. */
  | { type: 'CHANGE_LOG_RESET'; entries: ChangeLogEntry[] }
  /** Une nouvelle entrée, ajoutée côté panneau (plafond identique à la page). */
  | { type: 'CHANGE_LOG_ENTRY'; entry: ChangeLogEntry }
  /** Entrée existante annulée ou rétablie (même `id`, `undoneSeq` mis à jour). */
  | { type: 'CHANGE_LOG_ENTRY_UPDATED'; entry: ChangeLogEntry }
  | { type: 'REVERT_REJECTED'; id: number; reason: RevertRejection }
  /** Réponse à `REQUEST_FINAL_CLASSES`. */
  | { type: 'FINAL_CLASSES'; elements: ElementClassesSnapshot[] }
  | { type: 'LOCKED_CHANGED'; locked: boolean }

/** Direction de navigation clavier, relative à l'élément sélectionné. */
export type NavigateDirection = 'parent' | 'child' | 'prev' | 'next'

/** Messages envoyés par la fenêtre devpanel vers le content script. */
export type SyncFromPanel =
  | { type: 'APPLY_CHANGE'; edit: ClassEdit }
  /** Aperçu temporaire (survol d'une valeur) : appliqué sans historique, annulé par
   * `CANCEL_PREVIEW` ou remplacé par l'édition réelle. */
  | { type: 'PREVIEW_CHANGE'; edit: ClassEdit }
  | { type: 'CANCEL_PREVIEW' }
  /** Annule (`undo: true`) ou rétablit une entrée de l'historique. `liveRules` : CSS de
   * prévisualisation des classes qui vont être (ré)ajoutées, calculé par le panneau. */
  | { type: 'REVERT_CHANGE'; id: number; undo: boolean; liveRules: [string, LiveRule | null][] }
  | { type: 'REQUEST_FINAL_CLASSES' }
  | { type: 'REMOVE_CLASS'; rawClass: string }
  | { type: 'TOGGLE_CLASS'; rawClass: string }
  | { type: 'RUN_CSS_SCAN' }
  | { type: 'SELECT_ANCESTOR'; index: number }
  | { type: 'NAVIGATE'; direction: NavigateDirection }
  | { type: 'SET_LOCKED'; locked: boolean }
  | { type: 'CLEAR_CHANGE_LOG' }
