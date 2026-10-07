import { collectClassesWithRules } from '../core/css-scanner'
import { normalizeSingleRule } from '../core/css-guard'
import type { LiveRule, LiveRuleStatus } from '../types'

export const STYLE_ELEMENT_ID = 'devwind-live-styles'

// Plafond sur le nombre de règles injectées : au-delà de MAX_INJECTED, on purge les plus
// anciennes jusqu'à PRUNE_TO — mais seulement celles dont la classe n'est plus portée par aucun
// élément de la page (purger une règle encore appliquée ferait disparaître son effet visuel).
// Suffisant pour éviter une croissance illimitée sur une session d'édition très longue, sans
// MutationObserver global.
const MAX_INJECTED = 300
const PRUNE_TO = 250
const injected = new Map<string, Text>()

// Classes ayant une vraie règle dans le CSS du site : un seul parcours du CSSOM, réutilisé à
// chaque édition, puis invalidé quand les feuilles de style changent (cf. content/sync.ts).
let classesWithRules: Set<string> | null = null

export function invalidateRuleIndex(): void {
  classesWithRules = null
}

function hasRealRule(className: string): boolean {
  classesWithRules ??= collectClassesWithRules(document, STYLE_ELEMENT_ID)
  return classesWithRules.has(className)
}

function getStyleEl(): HTMLStyleElement {
  let el = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ELEMENT_ID
    document.head.appendChild(el)
  }
  return el
}

function isClassInUse(className: string): boolean {
  // getElementsByClassName prend un nom brut (pas de sélecteur) : aucun échappement nécessaire.
  return document.getElementsByClassName(className).length > 0
}

/** `justAdded` : règle qu'on vient d'injecter, pas encore posée sur l'élément (ensureLiveRule
 * est appelé avant applyClassEdit) — à ne surtout pas purger. */
function pruneIfNeeded(justAdded: string) {
  if (injected.size <= MAX_INJECTED) return
  let toRemove = injected.size - PRUNE_TO
  for (const [key, node] of injected) {
    if (toRemove <= 0) break
    if (key === justAdded || isClassInUse(key)) continue
    node.remove()
    injected.delete(key)
    toRemove--
  }
}

/** Les deux règles `dark:` synthétisées ont les mêmes déclarations et la même spécificité
 * (`:where()` en a zéro) : à égalité, seul l'ordre d'apparition dans la feuille tranche.
 * On émet en dernier la stratégie que le site utilise réellement en ce moment (`.dark` présent
 * sur `<html>`/`<body>` = stratégie classe ; sinon media query), pour que notre règle gagne
 * face à du vrai CSS du site qui ciblerait la même propriété avec une spécificité égale. */
function orderedRules(liveRule: LiveRule): string[] {
  if (!liveRule.dark) return liveRule.rules
  const [mediaRule, classRule] = liveRule.rules
  const hasDarkClass = document.documentElement.classList.contains('dark') || document.body?.classList.contains('dark')
  return hasDarkClass ? [mediaRule, classRule] : [classRule, mediaRule]
}

/**
 * Garantit qu'une classe a un effet visuel même si le CSS de la page ne la définit pas :
 * injecte le CSS synthétisé par le panneau (cf. core/live-style.ts) — sauf si une règle réelle
 * existe déjà, toujours préférée.
 */
export function ensureLiveRule(fullClassName: string, liveRule: LiveRule | null): LiveRuleStatus {
  if (injected.has(fullClassName)) return 'synthesized'
  if (hasRealRule(fullClassName)) return 'has-real-rule'
  if (!liveRule) return 'unsupported'

  // Chaque règle est parsée isolément par le navigateur et on injecte SA sérialisation : une
  // règle qui ne passe pas (sélecteur `has-[…]` invalide...) rend la classe non supportée au
  // lieu de casser ou de contaminer le reste de la feuille.
  const normalized = orderedRules(liveRule).map(normalizeSingleRule)
  if (normalized.some((r) => r == null)) return 'unsupported'

  const textNode = document.createTextNode(`${normalized.join('\n')}\n`)
  getStyleEl().appendChild(textNode)
  injected.set(fullClassName, textNode)
  pruneIfNeeded(fullClassName)
  return 'synthesized'
}
