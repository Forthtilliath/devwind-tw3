import { buildLiveRule } from '../../core/live-style'
import type { BreakpointMap } from '../../core/breakpoints'
import type { ChangeLogEntry, ElementClassesSnapshot, LiveRule } from '../../types'

// Annuler/rétablir côté panneau : choix de l'entrée visée (la page applique et vérifie) et CSS
// de prévisualisation des classes qui vont être réajoutées.

/** Ctrl+Z : la modification appliquée la plus récente. */
export function pickUndoTarget(log: ChangeLogEntry[]): ChangeLogEntry | null {
  for (let i = log.length - 1; i >= 0; i--) if (log[i].undoneSeq === undefined) return log[i]
  return null
}

/** Ctrl+Maj+Z : l'annulation la plus récente, seulement si aucune modification n'a été faite
 * depuis (comme un éditeur de texte : une nouvelle modification ferme la pile de rétablissement ;
 * le bouton "Rétablir" de l'historique reste disponible). Ids et `undoneSeq` partagent le même
 * compteur côté page, ce qui permet de les comparer. */
export function pickRedoTarget(log: ChangeLogEntry[]): ChangeLogEntry | null {
  let latestUndo: ChangeLogEntry | null = null
  let latestId = 0
  for (const entry of log) {
    latestId = Math.max(latestId, entry.id)
    if (entry.undoneSeq !== undefined && (latestUndo === null || entry.undoneSeq > (latestUndo.undoneSeq ?? 0))) latestUndo = entry
  }
  return latestUndo && (latestUndo.undoneSeq ?? 0) > latestId ? latestUndo : null
}

export function liveRulesFor(classNames: string[], breakpoints: BreakpointMap): [string, LiveRule | null][] {
  return classNames.map((c) => [c, buildLiveRule(c, breakpoints)])
}

/** Une ligne par modification appliquée : `sélecteur: +ajout −retrait`. */
export function formatChangeLog(log: ChangeLogEntry[]): string {
  return log
    .filter((e) => e.undoneSeq === undefined)
    .map((e) => `${e.selector}: ${[...e.added.map((c) => `+${c}`), ...e.removed.map((c) => `-${c}`)].join(' ')}`)
    .join('\n')
}

/** Une ligne par élément modifié : `sélecteur: classes finales`. */
export function formatFinalClasses(elements: ElementClassesSnapshot[]): string {
  return elements.map((e) => `${e.selector}: ${e.classes.join(' ')}`).join('\n')
}

// Réponse asynchrone de la page à `REQUEST_FINAL_CLASSES` (le Port est à sens unique).
let pending: ((elements: ElementClassesSnapshot[]) => void)[] = []

export function waitForFinalClasses(): Promise<ElementClassesSnapshot[]> {
  return new Promise((resolve) => {
    pending.push(resolve)
    // Page muette (déconnectée entre-temps) : on ne laisse pas l'appelant attendre indéfiniment.
    setTimeout(() => {
      if (pending.includes(resolve)) {
        pending = pending.filter((r) => r !== resolve)
        resolve([])
      }
    }, 3000)
  })
}

export function resolveFinalClasses(elements: ElementClassesSnapshot[]): void {
  const resolvers = pending
  pending = []
  for (const resolve of resolvers) resolve(elements)
}
