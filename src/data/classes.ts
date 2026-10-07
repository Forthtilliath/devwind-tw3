import generatedClasses from './generated/tailwind-classes.json'
import { taxonomy } from './taxonomy'
import type { GeneratedClass, TaxonomyEntry } from '../types'

// Accès indexés au dataset et à la taxonomie, construits une seule fois. Côté devpanel
// uniquement : le content script n'embarque plus le dataset (il reçoit le diff et le CSS déjà
// calculés, cf. content/sync.ts).

export const classes = generatedClasses as GeneratedClass[]

export const CLASS_BY_NAME = new Map(classes.map((c) => [c.className, c]))

export const TAXONOMY_BY_ID = new Map(taxonomy.map((e) => [e.id, e]))

/** Première entrée (ordre de la taxonomie) acceptant une valeur arbitraire pour ce préfixe. */
export const ARBITRARY_ENTRY_BY_PREFIX = new Map<string, TaxonomyEntry>()
for (const entry of taxonomy) {
  if (!entry.supportsArbitrary) continue
  for (const prefix of entry.prefixes) {
    if (!ARBITRARY_ENTRY_BY_PREFIX.has(prefix)) ARBITRARY_ENTRY_BY_PREFIX.set(prefix, entry)
  }
}
