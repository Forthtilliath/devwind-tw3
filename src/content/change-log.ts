import { applyClassDiff } from '../core/class-diff'
import { getClassAttr, readClassList } from '../core/class-attr'
import { shortElementLabel, uniqueSelector } from '../core/unique-selector'
import { ensureLiveRule } from './live-injection'
import { MAX_CHANGE_LOG_ENTRIES } from '../types'
import type { ChangeLogEntry, ClassChangeResult, ElementClassesSnapshot, LiveRule, RevertRejection } from '../types'

// Historique des modifications de TOUTE la page pendant la session (pas juste l'élément
// sélectionné) : permet de retrouver l'ensemble des changements faits à différents endroits
// sans avoir à s'en souvenir soi-même, et de les annuler. Vidé au rechargement de la page (le
// content script est ré-injecté à zéro), plafonné pour éviter une croissance illimitée.
let entries: ChangeLogEntry[] = []
/** Élément touché par chaque entrée (pour annuler/rétablir et exporter les classes finales). */
const entryElements = new Map<number, Element>()
/** Attribut `class` d'origine de chaque élément modifié (avant sa première modification). */
const originalClasses = new WeakMap<Element, string>()
/** Compteur partagé par les ids d'entrée et les annulations : leur ordre relatif dit au panneau
 * si une annulation est plus récente que la dernière modification (cf. `undoneSeq`). */
let seq = 0

export function getChangeLog(): ChangeLogEntry[] {
  return entries
}

export function clearChangeLog(): void {
  entries = []
  entryElements.clear()
}

/** Diffe un `ClassChangeResult` et l'ajoute à l'historique ; `null` si la modification n'a en
 * fait rien changé (ex. reposer la même valeur déjà active). */
export function logChange(el: Element, result: ClassChangeResult): ChangeLogEntry | null {
  const before = result.before.split(/\s+/).filter(Boolean)
  const after = result.after.split(/\s+/).filter(Boolean)
  const added = after.filter((c) => !before.includes(c))
  const removed = before.filter((c) => !after.includes(c))
  if (added.length === 0 && removed.length === 0) return null

  if (!originalClasses.has(el)) originalClasses.set(el, result.before)
  const entry: ChangeLogEntry = {
    id: ++seq,
    timestamp: Date.now(),
    elementLabel: shortElementLabel(el),
    selector: uniqueSelector(el),
    added,
    removed,
  }
  entries.push(entry)
  entryElements.set(entry.id, el)
  if (entries.length > MAX_CHANGE_LOG_ENTRIES) {
    const dropped = entries.slice(0, entries.length - MAX_CHANGE_LOG_ENTRIES)
    entries = entries.slice(dropped.length)
    for (const d of dropped) entryElements.delete(d.id)
  }
  return entry
}

export type RevertOutcome =
  | { ok: true; entry: ChangeLogEntry; el: Element }
  | { ok: false; reason: RevertRejection }
  | null

/**
 * Annule (`undo`) ou rétablit une entrée, par diff inverse plutôt qu'en restaurant l'attribut
 * entier : les modifications faites depuis sur d'autres classes du même élément sont gardées.
 * Refusé si l'élément a quitté la page, ou si les classes que l'on retirerait ne sont plus là
 * (modifiées depuis : appliquer le diff mélangerait deux états). `null` : entrée inconnue ou
 * déjà dans l'état demandé.
 */
export function revertEntry(id: number, undo: boolean, liveRules: Map<string, LiveRule | null>): RevertOutcome {
  const index = entries.findIndex((e) => e.id === id)
  const el = entryElements.get(id)
  if (index === -1 || !el) return null
  const entry = entries[index]
  if (undo === (entry.undoneSeq !== undefined)) return null
  if (!el.isConnected) return { ok: false, reason: 'detached' }

  const toRemove = undo ? entry.added : entry.removed
  const toAdd = undo ? entry.removed : entry.added
  const current = readClassList(el)
  if (!toRemove.every((c) => current.includes(c))) return { ok: false, reason: 'modified' }

  for (const cls of toAdd) ensureLiveRule(cls, liveRules.get(cls) ?? null)
  applyClassDiff(el, toRemove, toAdd)

  const updated: ChangeLogEntry = { ...entry }
  if (undo) updated.undoneSeq = ++seq
  else delete updated.undoneSeq
  entries[index] = updated
  return { ok: true, entry: updated, el }
}

/** Mêmes classes, dans n'importe quel ordre (une annulation rajoute les classes en fin de liste). */
function sameClassSet(a: string, b: string): boolean {
  const norm = (s: string) => s.split(/\s+/).filter(Boolean).sort().join(' ')
  return norm(a) === norm(b)
}

/** Classes actuelles de chaque élément modifié cette session, encore dans la page et différent
 * de son état d'origine (une modification annulée ne compte plus), dans l'ordre de première
 * modification. */
export function finalClasses(): ElementClassesSnapshot[] {
  const seen = new Set<Element>()
  const out: ElementClassesSnapshot[] = []
  for (const entry of entries) {
    const el = entryElements.get(entry.id)
    if (!el || seen.has(el)) continue
    seen.add(el)
    if (!el.isConnected || sameClassSet(getClassAttr(el), originalClasses.get(el) ?? '')) continue
    out.push({ selector: uniqueSelector(el), classes: readClassList(el) })
  }
  return out
}
