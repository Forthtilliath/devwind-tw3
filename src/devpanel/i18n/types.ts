export type Language = 'fr' | 'en'

/** Texte simple, ou variantes singulier/pluriel choisies selon le paramètre `count`. */
export type Message = string | { one: string; other: string }
