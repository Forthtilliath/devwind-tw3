import { addRawClass, applyClassEdit, removeRawClass } from '../core/class-diff'
import { readClassList } from '../core/class-attr'
import { computeEffectiveColors } from './element-colors'
import { scanStylesheetClasses, watchForStylesheetChanges } from '../core/css-scanner'
import { collectPrefixCandidates } from '../core/prefix-candidates'
import { ensureLiveRule, invalidateRuleIndex, STYLE_ELEMENT_ID } from './live-injection'
import { isSyncFromPanel } from '../core/message-guards'
import { clearChangeLog, finalClasses, getChangeLog, logChange, revertEntry } from './change-log'
import { cancelPreview, previewEdit } from './preview'
import { DEVWIND_SYNC_PORT } from '../types'
import type { AncestorInfo, ClassChangeResult, SyncFromContent, SyncFromPanel } from '../types'

// Élément actuellement sélectionné + chaîne de ses ancêtres (fil d'ariane), gardés hors de
// tout state React/store (c'est le content script qui a l'accès DOM réel ; la fenêtre devpanel
// ne voit que les classes/ancêtres qu'on lui envoie via le Port).
let selectedEl: Element | null = null
let ancestorElements: Element[] = []
let port: chrome.runtime.Port | null = null
let stopWatchingStylesheets: (() => void) | null = null

const MAX_ANCESTORS = 8

function describeAncestor(el: Element): AncestorInfo {
  return { tagName: el.tagName.toLowerCase(), id: el.id || null, classes: readClassList(el) }
}

/** Ajoute la modification à l'historique et en transmet la nouvelle entrée seule (le panneau
 * l'ajoute à sa copie, même plafond). */
function recordChange(el: Element, result: ClassChangeResult) {
  const entry = logChange(el, result)
  if (entry) send({ type: 'CHANGE_LOG_ENTRY', entry })
}

/** Du parent direct jusqu'à `<body>` inclus, plafonné pour éviter un fil d'ariane interminable
 * sur des pages très imbriquées. */
function computeAncestors(el: Element): Element[] {
  const chain: Element[] = []
  let current = el.parentElement
  while (current && chain.length < MAX_ANCESTORS) {
    chain.push(current)
    if (current === document.body) break
    current = current.parentElement
  }
  return chain
}

function send(message: SyncFromContent) {
  port?.postMessage(message)
}

function sendElementSelected(el: Element) {
  send({
    type: 'ELEMENT_SELECTED',
    tagName: el.tagName.toLowerCase(),
    classes: readClassList(el),
    ancestors: ancestorElements.map(describeAncestor),
    colors: computeEffectiveColors(el),
  })
}

async function runCssScan() {
  const result = await scanStylesheetClasses(document, STYLE_ELEMENT_ID)
  send({ type: 'CUSTOM_SCAN_RESULT', found: Array.from(result.found.entries()), unscannable: result.unscannable, breakpoints: result.breakpoints })
}

/** Un seul parcours du DOM, à la connexion puis à chaque changement de feuilles de style : le
 * panneau en déduit le préfixe de site (informatif en v3, cf. core/site-prefix.ts). */
function sendPrefixCandidates() {
  send({ type: 'PREFIX_CANDIDATES', candidates: collectPrefixCandidates() })
}

/** Les feuilles de style ont changé : index des vraies règles périmé, préfixe et liste "Custom"
 * à recalculer. */
function onStylesheetsChanged() {
  invalidateRuleIndex()
  sendPrefixCandidates()
  void runCssScan()
}

export interface SetupSyncOptions {
  onPortConnected: () => void
  onPortDisconnected: () => void
  /** Sélection changée (picker, fil d'ariane ou navigation clavier) ou ses classes modifiées :
   * sert à synchroniser le rectangle de surbrillance sur la page avec la sélection actuelle. */
  onSelectionChanged: (el: Element | null) => void
  onSetLocked: (locked: boolean) => void
}

let options: SetupSyncOptions | null = null

/** Centralise le changement de sélection (picker, fil d'ariane, clavier) : met à jour l'état,
 * recalcule les ancêtres, notifie la fenêtre devpanel ET le callback local (surbrillance). */
function setSelection(el: Element | null, detached = false) {
  cancelPreview()
  selectedEl = el
  ancestorElements = el ? computeAncestors(el) : []
  options?.onSelectionChanged(el)

  if (el) sendElementSelected(el)
  else send({ type: 'ELEMENT_CLEARED', detached })
}

/** Recalcule les couleurs effectives à chaque changement de classes (une édition peut changer
 * le texte ET le fond, ou le fond d'un ancêtre remonté par `computeEffectiveColors`). */
function sendClassesUpdated(el: Element, unsupportedClass?: string | null) {
  options?.onSelectionChanged(el)
  send({ type: 'CLASSES_UPDATED', classes: readClassList(el), unsupportedClass, colors: computeEffectiveColors(el) })
}

function navigate(direction: 'parent' | 'child' | 'prev' | 'next') {
  if (!selectedEl) return
  const target =
    direction === 'parent'
      ? selectedEl.parentElement
      : direction === 'child'
        ? selectedEl.firstElementChild
        : direction === 'prev'
          ? selectedEl.previousElementSibling
          : selectedEl.nextElementSibling
  // On ne monte pas plus haut que <body> (sélectionner <html>/<body> entier n'aide pas à éditer).
  if (!target || target === document.documentElement) return
  setSelection(target)
}

/** Élément sélectionné encore dans le DOM ? Une SPA qui re-rend le composant le remplace par
 * un nouveau nœud : éditer l'ancien n'aurait aucun effet visible, donc on vide la sélection et
 * on prévient le panneau plutôt que d'appliquer les éditions dans le vide. */
function ensureSelectionConnected(): boolean {
  if (!selectedEl) return false
  if (selectedEl.isConnected) return true
  setSelection(null, true)
  return false
}

const NEEDS_SELECTION = new Set<SyncFromPanel['type']>(['APPLY_CHANGE', 'PREVIEW_CHANGE', 'REMOVE_CLASS', 'TOGGLE_CLASS', 'NAVIGATE', 'SELECT_ANCESTOR'])
/** Messages qui ne touchent ni aux classes ni à la sélection : un aperçu en cours y survit. */
const KEEPS_PREVIEW = new Set<SyncFromPanel['type']>(['PREVIEW_CHANGE', 'RUN_CSS_SCAN', 'SET_LOCKED'])

function handlePanelMessage(raw: unknown) {
  if (!isSyncFromPanel(raw)) return
  const message: SyncFromPanel = raw
  // Toute édition/lecture part de l'état réel de l'élément, jamais de l'aperçu.
  if (!KEEPS_PREVIEW.has(message.type)) cancelPreview()
  if (NEEDS_SELECTION.has(message.type) && !ensureSelectionConnected()) return
  switch (message.type) {
    case 'APPLY_CHANGE': {
      if (!selectedEl) return
      const { edit } = message
      const unsupportedClass = edit.add && ensureLiveRule(edit.add, edit.liveRule) === 'unsupported' ? edit.add : null
      recordChange(selectedEl, applyClassEdit(selectedEl, edit))
      sendClassesUpdated(selectedEl, unsupportedClass)
      return
    }
    case 'PREVIEW_CHANGE': {
      if (selectedEl) previewEdit(selectedEl, message.edit)
      return
    }
    case 'CANCEL_PREVIEW':
      return // déjà annulé ci-dessus
    case 'REMOVE_CLASS': {
      if (!selectedEl) return
      recordChange(selectedEl, removeRawClass(selectedEl, message.rawClass))
      sendClassesUpdated(selectedEl)
      return
    }
    case 'TOGGLE_CLASS': {
      if (!selectedEl) return
      const current = readClassList(selectedEl)
      const result = current.includes(message.rawClass) ? removeRawClass(selectedEl, message.rawClass) : addRawClass(selectedEl, message.rawClass)
      recordChange(selectedEl, result)
      sendClassesUpdated(selectedEl)
      return
    }
    case 'REVERT_CHANGE': {
      const outcome = revertEntry(message.id, message.undo, new Map(message.liveRules))
      if (!outcome) return
      if (!outcome.ok) {
        send({ type: 'REVERT_REJECTED', id: message.id, reason: outcome.reason })
        return
      }
      send({ type: 'CHANGE_LOG_ENTRY_UPDATED', entry: outcome.entry })
      if (outcome.el === selectedEl) sendClassesUpdated(selectedEl)
      return
    }
    case 'REQUEST_FINAL_CLASSES': {
      send({ type: 'FINAL_CLASSES', elements: finalClasses() })
      return
    }
    case 'RUN_CSS_SCAN': {
      void runCssScan()
      return
    }
    case 'SELECT_ANCESTOR': {
      const target = ancestorElements[message.index]
      if (target) setSelection(target)
      return
    }
    case 'NAVIGATE': {
      navigate(message.direction)
      return
    }
    case 'SET_LOCKED': {
      options?.onSetLocked(message.locked)
      return
    }
    case 'CLEAR_CHANGE_LOG': {
      clearChangeLog()
      send({ type: 'CHANGE_LOG_RESET', entries: getChangeLog() })
      return
    }
  }
}

/** Écoute la connexion de la fenêtre devpanel (Port nommé DEVWIND_SYNC_PORT). */
export function setupSync(opts: SetupSyncOptions) {
  options = opts
  chrome.runtime.onConnect.addListener((p) => {
    // Seule NOTRE fenêtre devpanel (même id d'extension) a le droit de piloter la page.
    if (p.name !== DEVWIND_SYNC_PORT || p.sender?.id !== chrome.runtime.id) return
    port = p
    opts.onPortConnected()
    // Avant la sélection : le panneau connaît ainsi le préfixe avant son premier scan CSS, les
    // messages du Port arrivant dans l'ordre.
    invalidateRuleIndex()
    sendPrefixCandidates()
    if (selectedEl) sendElementSelected(selectedEl)
    // Surbrillance masquée à la fermeture du panneau précédent : on la réaffiche.
    opts.onSelectionChanged(selectedEl)

    // Toujours renvoyé, même vide : une fenêtre devpanel réouverte doit refléter l'historique
    // déjà accumulé cette session (le content script, lui, n'est pas ré-injecté à chaque
    // ouverture du panneau).
    send({ type: 'CHANGE_LOG_RESET', entries: getChangeLog() })

    // Re-scanne automatiquement (debounced) si le site charge une feuille de style après coup
    // (route SPA, composant lazy-loadé...), pour ne pas laisser la liste "Custom" périmée tant
    // que la fenêtre devpanel reste ouverte.
    stopWatchingStylesheets?.()
    stopWatchingStylesheets = watchForStylesheetChanges(onStylesheetsChanged, document, STYLE_ELEMENT_ID)

    p.onMessage.addListener(handlePanelMessage)
    p.onDisconnect.addListener(() => {
      if (port === p) port = null
      cancelPreview()
      stopWatchingStylesheets?.()
      stopWatchingStylesheets = null
      opts.onPortDisconnected()
    })
  })
}

/** Appelé par le picker quand l'utilisateur sélectionne un élément de la page (clic). */
export function selectElement(el: Element | null) {
  setSelection(el)
}

/** Appelé quand le verrouillage est déclenché depuis LA PAGE (Échap, cf. main.ts) plutôt que
 * depuis le bouton 🔒 du panneau : contrairement à `SET_LOCKED` (panneau → page), il n'y a rien
 * à appliquer côté page ici (déjà fait par l'appelant), juste à synchroniser l'icône du panneau. */
export function notifyLockedFromPage(locked: boolean) {
  send({ type: 'LOCKED_CHANGED', locked })
}
