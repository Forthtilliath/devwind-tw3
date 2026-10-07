/**
 * Sélecteur de classe CSS, en gérant les caractères échappés (`\:`, `\/`, `\[`, `\]`, `\.`...)
 * que Tailwind génère pour les variants/valeurs arbitraires dans le sélecteur compilé
 * (ex. `.hover\:bg-red-500:hover`, `.w-\[100px\]`). Un caractère normal OU un backslash
 * suivi de n'importe quel caractère sont acceptés ; on s'arrête au premier caractère
 * "non échappé" qui ne fait pas partie d'un nom de classe (`:`, ` `, `.`, `>`, `[`...).
 */
const CLASS_SELECTOR_RE = /\.((?:[A-Za-z0-9_-]|\\[0-9a-fA-F]{1,6} ?|\\.)+)/g

/** Retire les échappements CSS, y compris hexadécimaux (`\33 xl` -> `3xl`, émis par Tailwind
 * pour un nom de classe qui commence par un chiffre). */
function unescapeCssIdent(raw: string): string {
  return raw.replace(/\\([0-9a-fA-F]{1,6}) ?|\\(.)/g, (_, hex: string | undefined, ch: string | undefined) =>
    hex ? String.fromCodePoint(Number.parseInt(hex, 16)) : (ch as string),
  )
}

/** Noms (déséchappés) des classes d'un sélecteur, dans l'ordre. */
export function extractClassSelectors(selectorText: string): string[] {
  const out: string[] = []
  for (const m of selectorText.matchAll(CLASS_SELECTOR_RE)) {
    out.push(unescapeCssIdent(m[1]))
  }
  return out
}

export function isRuleWithSelector(rule: CSSRule): rule is CSSStyleRule {
  return 'selectorText' in rule
}

export function isGroupingRule(rule: CSSRule): rule is CSSMediaRule | CSSSupportsRule {
  return 'cssRules' in rule
}
