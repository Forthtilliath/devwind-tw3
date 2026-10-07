import type {
  AncestorInfo,
  BreakpointVote,
  ChangeLogEntry,
  ClassEdit,
  ElementClassesSnapshot,
  ElementColors,
  LiveRule,
  PickerMessage,
  PrefixCandidate,
  SyncFromContent,
  SyncFromPanel,
} from '../types'

// Validation runtime des messages qui transitent par `chrome.runtime` : TypeScript ne garantit
// rien sur ce qui arrive réellement par le Port (version désynchronisée après une mise à jour,
// bug d'un côté, page compromise côté content script...). Un message mal formé est ignoré.

type Rec = Record<string, unknown>

const isRecord = (v: unknown): v is Rec => typeof v === 'object' && v !== null
const isString = (v: unknown): v is string => typeof v === 'string'
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isArrayOf = <T>(v: unknown, item: (x: unknown) => x is T): v is T[] => Array.isArray(v) && v.every(item)
const isStringArray = (v: unknown): v is string[] => isArrayOf(v, isString)
const isNullableString = (v: unknown): v is string | null => v === null || isString(v)

/** Une classe = un seul jeton, sans espace (sinon `addRawClass` en ajouterait plusieurs). */
const isClassToken = (v: unknown): v is string => isString(v) && /^\S+$/.test(v)

const NAV_DIRECTIONS = new Set<unknown>(['parent', 'child', 'prev', 'next'])

/** Préfixe de site (collé au nom en v3, ex. `tw-`) : même forme que celle acceptée à la détection. */
const isSitePrefix = (v: unknown): v is string => isString(v) && /^[a-z][a-z0-9-]*$/.test(v)

/** Une règle sans `dark:`, ou exactement les deux règles `dark:` (media puis classe). Le texte
 * CSS est de toute façon re-parsé règle par règle avant injection (`normalizeSingleRule`). */
function isLiveRule(v: unknown): v is LiveRule {
  return isRecord(v) && isBool(v.dark) && isStringArray(v.rules) && v.rules.length === (v.dark ? 2 : 1)
}

function isClassEdit(v: unknown): v is ClassEdit {
  return (
    isRecord(v) &&
    isArrayOf(v.remove, isClassToken) &&
    (v.add === null || isClassToken(v.add)) &&
    (v.liveRule === null || isLiveRule(v.liveRule))
  )
}

const isLiveRuleEntry = (v: unknown): v is [string, LiveRule | null] =>
  Array.isArray(v) && v.length === 2 && isClassToken(v[0]) && (v[1] === null || isLiveRule(v[1]))

export function isSyncFromPanel(m: unknown): m is SyncFromPanel {
  if (!isRecord(m)) return false
  switch (m.type) {
    case 'APPLY_CHANGE':
    case 'PREVIEW_CHANGE':
      return isClassEdit(m.edit)
    case 'REMOVE_CLASS':
    case 'TOGGLE_CLASS':
      return isClassToken(m.rawClass)
    case 'REVERT_CHANGE':
      return Number.isInteger(m.id) && isBool(m.undo) && isArrayOf(m.liveRules, isLiveRuleEntry)
    case 'RUN_CSS_SCAN':
    case 'CLEAR_CHANGE_LOG':
    case 'CANCEL_PREVIEW':
    case 'REQUEST_FINAL_CLASSES':
      return true
    case 'SELECT_ANCESTOR':
      return Number.isInteger(m.index) && (m.index as number) >= 0
    case 'NAVIGATE':
      return NAV_DIRECTIONS.has(m.direction)
    case 'SET_LOCKED':
      return isBool(m.locked)
    default:
      return false
  }
}

export function isPickerMessage(m: unknown): m is PickerMessage {
  if (!isRecord(m)) return false
  if (m.type === 'DEVWIND_SET_ACTIVE') return isBool(m.active)
  return m.type === 'DEVWIND_PING'
}

function isAncestorInfo(v: unknown): v is AncestorInfo {
  return isRecord(v) && isString(v.tagName) && isNullableString(v.id) && isStringArray(v.classes)
}

function isElementColors(v: unknown): v is ElementColors {
  return (
    isRecord(v) &&
    isString(v.color) &&
    isString(v.backgroundColor) &&
    isStringArray(v.backdrop) &&
    isBool(v.approximate) &&
    isNumber(v.fontSize) &&
    isBool(v.bold)
  )
}

function isChangeLogEntry(v: unknown): v is ChangeLogEntry {
  return (
    isRecord(v) &&
    isNumber(v.id) &&
    isNumber(v.timestamp) &&
    isString(v.elementLabel) &&
    isString(v.selector) &&
    isStringArray(v.added) &&
    isStringArray(v.removed) &&
    (v.undoneSeq === undefined || isNumber(v.undoneSeq))
  )
}

const isScanEntry = (v: unknown): v is [string, string[]] => Array.isArray(v) && v.length === 2 && isString(v[0]) && isStringArray(v[1])

const isPrefixCandidate = (v: unknown): v is PrefixCandidate =>
  Array.isArray(v) && v.length === 3 && isSitePrefix(v[0]) && isString(v[1]) && Number.isInteger(v[2]) && (v[2] as number) > 0

const isBreakpointVote = (v: unknown): v is BreakpointVote =>
  Array.isArray(v) &&
  v.length === 5 &&
  isString(v[0]) &&
  isString(v[1]) &&
  (v[2] === 'min' || v[2] === 'max') &&
  isString(v[3]) &&
  Number.isInteger(v[4]) &&
  (v[4] as number) > 0

const isElementClassesSnapshot = (v: unknown): v is ElementClassesSnapshot => isRecord(v) && isString(v.selector) && isStringArray(v.classes)

const REVERT_REJECTIONS = new Set<unknown>(['detached', 'modified'])

export function isSyncFromContent(m: unknown): m is SyncFromContent {
  if (!isRecord(m)) return false
  switch (m.type) {
    case 'ELEMENT_SELECTED':
      return isString(m.tagName) && isStringArray(m.classes) && isArrayOf(m.ancestors, isAncestorInfo) && isElementColors(m.colors)
    case 'ELEMENT_CLEARED':
      return m.detached === undefined || isBool(m.detached)
    case 'CLASSES_UPDATED':
      return isStringArray(m.classes) && (m.unsupportedClass == null || isString(m.unsupportedClass)) && isElementColors(m.colors)
    case 'CUSTOM_SCAN_RESULT':
      return isArrayOf(m.found, isScanEntry) && isStringArray(m.unscannable) && isArrayOf(m.breakpoints, isBreakpointVote)
    case 'PREFIX_CANDIDATES':
      return isArrayOf(m.candidates, isPrefixCandidate)
    case 'CHANGE_LOG_RESET':
      return isArrayOf(m.entries, isChangeLogEntry)
    case 'CHANGE_LOG_ENTRY':
    case 'CHANGE_LOG_ENTRY_UPDATED':
      return isChangeLogEntry(m.entry)
    case 'REVERT_REJECTED':
      return isNumber(m.id) && REVERT_REJECTIONS.has(m.reason)
    case 'FINAL_CLASSES':
      return isArrayOf(m.elements, isElementClassesSnapshot)
    case 'LOCKED_CHANGED':
      return isBool(m.locked)
    default:
      return false
  }
}
