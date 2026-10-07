// Garde-fous sur le CSS synthétisé par live-style.ts : valeurs arbitraires et contenu des
// variants `has-[…]`/`data-[…]` viennent de la saisie de l'utilisateur et finissent dans le
// texte d'un `<style>` injecté dans la page. Sans contrôle, un `}` ou un `;` dans une valeur
// casse la règle, voire en injecte d'autres.

/** Garde les déclarations (`propriété: valeur`) que le navigateur sait parser, `!important`
 * non compris (ajouté ensuite). Une valeur arbitraire invalide est ainsi écartée ici plutôt
 * que d'être injectée pour rien. */
export function filterSupportedDeclarations(decls: string[]): string[] {
  return decls.filter((decl) => {
    const colon = decl.indexOf(':')
    if (colon === -1) return false
    const prop = decl.slice(0, colon).trim()
    const value = decl.slice(colon + 1).trim()
    // Variable CSS vide (`--tw-blur: ;`, cf. composite.ts) : valide en déclaration mais refusée
    // par `CSS.supports` — et sans danger, il n'y a rien à injecter.
    if (value === '' && prop.startsWith('--')) return true
    return CSS.supports(prop, value)
  })
}

// Feuille détachée, jamais attachée au document : sert uniquement à faire parser une règle par
// le navigateur avant de l'injecter.
let validationSheet: CSSStyleSheet | null = null

/** Fait parser `ruleText` par le navigateur : `insertRule` n'accepte qu'UNE règle valide et lève
 * une `SyntaxError` sinon (règle cassée, ou `}` qui en ferme une pour en ouvrir une autre).
 * Renvoie la forme sérialisée par le navigateur (garantie bien formée), ou `null`. */
export function normalizeSingleRule(ruleText: string): string | null {
  validationSheet ??= new CSSStyleSheet()
  try {
    validationSheet.insertRule(ruleText, 0)
  } catch {
    return null
  }
  const serialized = validationSheet.cssRules[0].cssText
  validationSheet.deleteRule(0)
  return serialized
}

/**
 * Fragment de sélecteur sûr à placer dans `:has(…)` : parenthèses/crochets équilibrés (sinon
 * `has-[a),body_*,x:has(b]` sortirait du `:has()` pour cibler toute la page tout en restant une
 * seule règle valide), pas de `{`, `}` ni `;`, guillemets refermés. Les échappements `\x` sont
 * sautés pour ne pas compter `\)` comme une vraie parenthèse.
 */
export function isBalancedSelectorFragment(fragment: string): boolean {
  const stack: string[] = []
  let quote: string | null = null
  for (let i = 0; i < fragment.length; i++) {
    const ch = fragment[i]
    if (ch === '\\') {
      i++
      continue
    }
    if (quote) {
      if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") quote = ch
    else if (ch === '{' || ch === '}' || ch === ';') return false
    else if (ch === '(' || ch === '[') stack.push(ch === '(' ? ')' : ']')
    else if (ch === ')' || ch === ']') {
      if (stack.pop() !== ch) return false
    }
  }
  return stack.length === 0 && quote === null
}
