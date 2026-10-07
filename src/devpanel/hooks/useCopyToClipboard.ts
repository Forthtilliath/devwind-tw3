import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_FEEDBACK_MS = 1200

/**
 * Copie dans le presse-papiers + retour visuel temporaire ("Copié !"). `copied` vaut la clé de
 * la dernière copie réussie (par défaut le texte copié) pendant `feedbackMs`, puis `null` : une
 * liste de boutons peut ainsi n'afficher le retour que sur celui qui vient d'être cliqué.
 */
export function useCopyToClipboard(feedbackMs = DEFAULT_FEEDBACK_MS) {
  const [copied, setCopied] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = useCallback(
    async (text: string, key: string = text): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        // Presse-papiers refusé (fenêtre sans focus, permission) : pas de faux "Copié !".
        return false
      }
      setCopied(key)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(null), feedbackMs)
      return true
    },
    [feedbackMs],
  )

  return { copied, copy }
}
