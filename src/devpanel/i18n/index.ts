import { fr } from './messages-fr'
import { en } from './messages-en'
import type { MessageKey } from './messages-fr'
import type { Language, Message } from './types'

export type { Language } from './types'
export type { MessageKey } from './messages-fr'
export { translateCategory, translateSubcategory } from './taxonomy-labels'

// Traduction de l'interface du panneau, commutable à chaud (bouton FR/EN) : `chrome.i18n` suit
// la langue du navigateur sans pouvoir en changer à l'exécution, il ne sert donc qu'au manifest
// (`public/_locales/`, nom et description affichés par Chrome et le Web Store).

const STORAGE_KEY = 'devwind-language'

const MESSAGES: Record<Language, Record<MessageKey, Message>> = { fr, en }

/** Langue choisie précédemment, sinon celle du navigateur (français ou, à défaut, anglais). */
export async function loadLanguage(): Promise<Language> {
  const stored = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY]
  if (stored === 'fr' || stored === 'en') return stored
  return chrome.i18n.getUILanguage().toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

export async function setLanguage(lang: Language): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: lang })
}

export const NEXT_LANGUAGE: Record<Language, Language> = { fr: 'en', en: 'fr' }
export const LANGUAGE_LABEL: Record<Language, string> = { fr: 'FR', en: 'EN' }

export type MessageParams = Record<string, string | number>

export type Translate = (key: MessageKey, params?: MessageParams) => string

export function translate(lang: Language, key: MessageKey, params?: MessageParams): string {
  const message = MESSAGES[lang][key]
  const template =
    typeof message === 'string' ? message : new Intl.PluralRules(lang).select(Number(params?.count ?? 0)) === 'one' ? message.one : message.other
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}
