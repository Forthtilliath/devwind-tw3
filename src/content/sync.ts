import { addRawClass, applyClassChange, removeRawClass } from '../core/class-diff'
import { scanCustomClasses, watchForStylesheetChanges } from '../core/css-scanner'
import { ensureLiveRule } from '../core/live-style'
import { DEVWIND_SYNC_PORT } from '../types'
import type { AncestorInfo, ChangeLogEntry, ClassChangeResult, ElementColors, SyncFromContent, SyncFromPanel } from '../types'

// Élément actuellement sélectionné + chaîne de ses ancêtres (fil d'ariane), gardés hors de
// tout state React/store (c'est le content script qui a l'accès DOM réel ; la fenêtre devpanel
// ne voit que les classes/ancêtres qu'on lui envoie via le Port).
let selectedEl: Element | null = null
let ancestorElements: Element[] = []
let port: chrome.runtime.Port | null = null
let stopWatchingStylesheets: (() => void) | null = null

const MAX_ANCESTORS = 8

// Historique des modifications de TOUTE la page pendant la session (pas juste l'élément
// sélectionné) : permet de retrouver l'ensemble des changements faits à différents endroits
// sans avoir à s'en souvenir soi-même. Vidé au rechargement de la page (le content script est
// ré-injecté à zéro), plafonné pour éviter une croissance illimitée sur une session très longue.
const MAX_LOG_ENTRIES = 300
let changeLog: ChangeLogEntry[] = []
let changeLogIdCounter = 0

function readClasses(el: Element): string[] {
  return el.className.toString().split(/\s+/).filter(Boolean)
}

function describeAncestor(el: Element): AncestorInfo {
  return { tagName: el.tagName.toLowerCase(), id: el.id || null, classes: readClasses(el) }
}

/** Description légère mais STABLE d'un élément (jamais basée sur ses classes, puisque ce sont
 * justement elles qui changent) : id si présent, sinon position parmi ses frères de même tag —
 * pas un sélecteur garanti unique, juste de quoi se repérer visuellement dans l'historique. */
function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase()
  if (el.id) return `${tag}#${el.id}`
  const parent = el.parentElement
  if (!parent) return tag
  const siblingsOfSameTag = Array.from(parent.children).filter((c) => c.tagName === el.tagName)
  if (siblingsOfSameTag.length <= 1) return tag
  return `${tag}:nth-of-type(${siblingsOfSameTag.indexOf(el) + 1})`
}

/** Diffe un `ClassChangeResult` et l'ajoute à l'historique de session (silencieux si la
 * modification n'a en fait rien changé, ex. reposer la même valeur déjà active). */
function logChange(el: Element, result: ClassChangeResult) {
  const before = result.before.split(/\s+/).filter(Boolean)
  const after = result.after.split(/\s+/).filter(Boolean)
  const added = after.filter((c) => !before.includes(c))
  const removed = before.filter((c) => !after.includes(c))
  if (added.length === 0 && removed.length === 0) return

  changeLog.push({ id: ++changeLogIdCounter, timestamp: Date.now(), elementLabel: describeElement(el), added, removed })
  if (changeLog.length > MAX_LOG_ENTRIES) changeLog = changeLog.slice(changeLog.length - MAX_LOG_ENTRIES)
  send({ type: 'CHANGE_LOG_UPDATED', entries: changeLog })
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

function isTransparent(color: string): boolean {
  const m = /rgba\([^)]+,\s*([\d.]+)\)/.exec(color)
  return color === 'transparent' || (m != null && Number(m[1]) === 0)
}

/** Couleur de fond effective : remonte les ancêtres tant que `background-color` est
 * transparent, pour refléter le fond réellement visible derrière l'élément plutôt qu'un
 * `rgba(0,0,0,0)` inutile au calcul de contraste. Blanc par défaut si toute la chaîne est
 * transparente (cas `<body>` sans fond explicite, comportement de rendu par défaut). */
function computeEffectiveColors(el: Element): ElementColors {
  const style = getComputedStyle(el)
  let bg = style.backgroundColor
  let current: Element | null = el
  while (current && isTransparent(bg)) {
    current = current.parentElement
    if (!current) break
    bg = getComputedStyle(current).backgroundColor
  }
  if (!bg || isTransparent(bg)) bg = 'rgb(255, 255, 255)'
  return {
    color: style.color,
    backgroundColor: bg,
    fontSize: parseFloat(style.fontSize),
    bold: Number(style.fontWeight) >= 700,
  }
}

function send(message: SyncFromContent) {
  port?.postMessage(message)
}

async function runCssScan() {
  const result = await scanCustomClasses()
  send({
    type: 'CUSTOM_SCAN_RESULT',
    found: Array.from(result.found.entries()),
    unscannable: result.unscannable,
    detectedPrefix: result.detectedPrefix,
  })
}

export interface SetupSyncOptions {
  onPortConnected: () => void
  onPortDisconnected: () => void
  /** Sélection changée (picker, fil d'ariane ou navigation clavier) : sert à synchroniser le
   * rectangle de surbrillance sur la page avec la sélection actuelle. */
  onSelectionChanged: (el: Element | null) => void
  onSetLocked: (locked: boolean) => void
}

let options: SetupSyncOptions | null = null

/** Centralise le changement de sélection (picker, fil d'ariane, clavier) : met à jour l'état,
 * recalcule les ancêtres, notifie la fenêtre devpanel ET le callback local (surbrillance). */
function setSelection(el: Element | null) {
  selectedEl = el
  ancestorElements = el ? computeAncestors(el) : []
  options?.onSelectionChanged(el)

  if (!el) {
    send({ type: 'ELEMENT_CLEARED' })
    return
  }
  send({
    type: 'ELEMENT_SELECTED',
    tagName: el.tagName.toLowerCase(),
    classes: readClasses(el),
    ancestors: ancestorElements.map(describeAncestor),
    colors: computeEffectiveColors(el),
  })
}

/** Recalcule les couleurs effectives à chaque changement de classes (une édition peut changer
 * le texte ET le fond, ou le fond d'un ancêtre remonté par `computeEffectiveColors`). */
function sendClassesUpdated(el: Element, unsupportedClass?: string | null) {
  send({ type: 'CLASSES_UPDATED', classes: readClasses(el), unsupportedClass, colors: computeEffectiveColors(el) })
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

function handlePanelMessage(message: SyncFromPanel) {
  switch (message.type) {
    case 'APPLY_CHANGE': {
      if (!selectedEl) return
      let unsupportedClass: string | null = null
      if (message.request.newBase) {
        const fullClassName = [...message.request.variants, message.request.newBase].join(':')
        if (ensureLiveRule(fullClassName) === 'unsupported') unsupportedClass = fullClassName
      }
      logChange(selectedEl, applyClassChange(selectedEl, message.request))
      sendClassesUpdated(selectedEl, unsupportedClass)
      return
    }
    case 'REMOVE_CLASS': {
      if (!selectedEl) return
      logChange(selectedEl, removeRawClass(selectedEl, message.rawClass))
      sendClassesUpdated(selectedEl)
      return
    }
    case 'TOGGLE_CLASS': {
      if (!selectedEl) return
      const current = readClasses(selectedEl)
      const result = current.includes(message.rawClass) ? removeRawClass(selectedEl, message.rawClass) : addRawClass(selectedEl, message.rawClass)
      logChange(selectedEl, result)
      sendClassesUpdated(selectedEl)
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
      changeLog = []
      send({ type: 'CHANGE_LOG_UPDATED', entries: changeLog })
      return
    }
  }
}

/** Écoute la connexion de la fenêtre devpanel (Port nommé DEVWIND_SYNC_PORT). */
export function setupSync(opts: SetupSyncOptions) {
  options = opts
  chrome.runtime.onConnect.addListener((p) => {
    if (p.name !== DEVWIND_SYNC_PORT) return
    port = p
    opts.onPortConnected()
    if (selectedEl) {
      send({
        type: 'ELEMENT_SELECTED',
        tagName: selectedEl.tagName.toLowerCase(),
        classes: readClasses(selectedEl),
        ancestors: ancestorElements.map(describeAncestor),
        colors: computeEffectiveColors(selectedEl),
      })
    }

    // Toujours renvoyé, même vide : une fenêtre devpanel réouverte doit refléter l'historique
    // déjà accumulé cette session (le content script, lui, n'est pas ré-injecté à chaque
    // ouverture du panneau).
    send({ type: 'CHANGE_LOG_UPDATED', entries: changeLog })

    // Re-scanne automatiquement (debounced) si le site charge une feuille de style après coup
    // (route SPA, composant lazy-loadé...), pour ne pas laisser la liste "Custom" périmée tant
    // que la fenêtre devpanel reste ouverte.
    stopWatchingStylesheets?.()
    stopWatchingStylesheets = watchForStylesheetChanges(() => void runCssScan())

    p.onMessage.addListener(handlePanelMessage)
    p.onDisconnect.addListener(() => {
      if (port === p) port = null
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

/** Appelé quand le verrouillage est déclenché depuis LA PAGE (Échap, cf. main.tsx) plutôt que
 * depuis le bouton 🔒 du panneau : contrairement à `SET_LOCKED` (panneau → page), il n'y a rien
 * à appliquer côté page ici (déjà fait par l'appelant), juste à synchroniser l'icône du panneau. */
export function notifyLockedFromPage(locked: boolean) {
  send({ type: 'LOCKED_CHANGED', locked })
}
