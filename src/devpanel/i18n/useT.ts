import { useCallback } from 'react'
import { useDevPanelStore } from '../store/useDevPanelStore'
import { translate } from '.'
import type { MessageKey, MessageParams, Translate } from '.'

/** `t(clé, paramètres)` dans la langue courante du panneau (re-rendu au changement de langue). */
export function useT(): Translate {
  const language = useDevPanelStore((s) => s.language)
  return useCallback((key: MessageKey, params?: MessageParams) => translate(language, key, params), [language])
}
