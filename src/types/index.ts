// Protocole de messages entre popup et content script.
export type PickerMessage =
  | { type: 'DEVWIND_PING' }
  | { type: 'DEVWIND_GET_STATE' }
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

/** `GeneratedClass` sans `category`/`subcategory` (affichage/regroupement uniquement, cf.
 * devpanel) — dataset embarqué dans le content script (class-parser.ts, live-style.ts), qui
 * n'a besoin que des champs servant à la reconnaissance/synthèse de classes. */
export type SlimGeneratedClass = Omit<GeneratedClass, 'category' | 'subcategory'>

// --- Parsing / diff de classes ---

export interface ParsedClass {
  raw: string
  variants: string[]
  base: string
}

export interface VariantContext {
  breakpoint: string | null
  pseudo: string[]
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

// --- Scan CSS ---

export interface CustomClassInfo {
  className: string
  sources: string[]
}

export interface CssScanResult {
  found: Map<string, string[]>
  unscannable: string[]
}

// --- Historique des modifications de la session (toute la page, pas juste l'élément courant) ---

export interface ChangeLogEntry {
  id: number
  timestamp: number
  /** Description légère de l'élément touché (ex. `button#target-btn`, `li:nth-of-type(2)`) —
   * pas un sélecteur garanti unique, juste assez pour se repérer visuellement. */
  elementLabel: string
  added: string[]
  removed: string[]
}

// --- Synchronisation content script <-> fenêtre devpanel (via chrome.runtime.Port) ---

export const DEVWIND_SYNC_PORT = 'devwind-sync'

/** Un ancêtre dans le fil d'ariane (cf. DevPanel), du parent direct jusqu'à `<body>`. */
export interface AncestorInfo {
  tagName: string
  id: string | null
  classes: string[]
}

/** Résultat de `ensureLiveRule` (live-style.ts) : `has-real-rule` = le CSS du site définit
 * déjà cette classe (rien synthétisé) ; `synthesized` = injectée par nous ; `unsupported` =
 * ni l'un ni l'autre, la classe appliquée n'aura probablement aucun effet visuel (ex. `dark:`
 * sans stratégie détectable, variant non géré...). */
export type LiveRuleStatus = 'has-real-rule' | 'synthesized' | 'unsupported'

/** Couleurs effectives de l'élément sélectionné (`getComputedStyle`, dans n'importe quelle
 * syntaxe — `rgb()` ou `oklch()`/`lab()` selon le navigateur et l'origine de la couleur ;
 * `core/contrast.ts` sait convertir les deux). Sert au contrôle de contraste. `backgroundColor`
 * remonte les ancêtres si transparente, pour refléter le fond réellement visible derrière le
 * texte plutôt qu'un `transparent` inutile. */
export interface ElementColors {
  color: string
  backgroundColor: string
  fontSize: number
  bold: boolean
}

/** Messages envoyés par le content script vers la fenêtre devpanel connectée. */
export type SyncFromContent =
  | { type: 'ELEMENT_SELECTED'; tagName: string; classes: string[]; ancestors: AncestorInfo[]; colors: ElementColors }
  | { type: 'ELEMENT_CLEARED' }
  | { type: 'CLASSES_UPDATED'; classes: string[]; unsupportedClass?: string | null; colors: ElementColors }
  | { type: 'CUSTOM_SCAN_RESULT'; found: [string, string[]][]; unscannable: string[] }
  | { type: 'CHANGE_LOG_UPDATED'; entries: ChangeLogEntry[] }
  | { type: 'LOCKED_CHANGED'; locked: boolean }

/** Direction de navigation clavier, relative à l'élément sélectionné. */
export type NavigateDirection = 'parent' | 'child' | 'prev' | 'next'

/** Messages envoyés par la fenêtre devpanel vers le content script. */
export type SyncFromPanel =
  | { type: 'APPLY_CHANGE'; request: ClassChangeRequest }
  | { type: 'REMOVE_CLASS'; rawClass: string }
  | { type: 'TOGGLE_CLASS'; rawClass: string }
  | { type: 'RUN_CSS_SCAN' }
  | { type: 'SELECT_ANCESTOR'; index: number }
  | { type: 'NAVIGATE'; direction: NavigateDirection }
  | { type: 'SET_LOCKED'; locked: boolean }
  | { type: 'CLEAR_CHANGE_LOG' }
