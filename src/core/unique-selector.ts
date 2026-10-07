// Sélecteur CSS qui désigne un élément et lui seul, pour l'export de l'historique : jamais basé
// sur les classes (ce sont elles qu'on modifie), seulement sur les ids uniques et la position
// parmi les frères de même tag. Le plus court suffixe de chemin encore unique est retenu.

type QueryRoot = Document | ShadowRoot

function queryRoot(el: Element): QueryRoot {
  const root = el.getRootNode()
  return root instanceof ShadowRoot ? root : el.ownerDocument
}

function hasUniqueId(el: Element, root: QueryRoot): boolean {
  return el.id !== '' && root.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1
}

/** Segment d'un élément : `tag#id` si son id est unique, sinon `tag` ou `tag:nth-of-type(n)`. */
function segment(el: Element, root: QueryRoot): string {
  const tag = el.tagName.toLowerCase()
  if (hasUniqueId(el, root)) return `${tag}#${CSS.escape(el.id)}`
  const parent = el.parentElement
  if (!parent) return tag
  const sameTag = Array.from(parent.children).filter((c) => c.tagName === el.tagName)
  return sameTag.length > 1 ? `${tag}:nth-of-type(${sameTag.indexOf(el) + 1})` : tag
}

function matchesOnly(selector: string, el: Element, root: QueryRoot): boolean {
  try {
    const found = root.querySelectorAll(selector)
    return found.length === 1 && found[0] === el
  } catch {
    return false
  }
}

export function uniqueSelector(el: Element): string {
  const root = queryRoot(el)
  const parts: string[] = []
  let current: Element | null = el
  // Remonte jusqu'au premier ancêtre à id unique (ancre suffisante) ou jusqu'à `<body>`.
  while (current && current !== el.ownerDocument.documentElement) {
    parts.unshift(segment(current, root))
    if (hasUniqueId(current, root) || current === el.ownerDocument.body) break
    current = current.parentElement
  }
  for (let i = parts.length - 1; i > 0; i--) {
    const candidate = parts.slice(i).join(' > ')
    if (matchesOnly(candidate, el, root)) return candidate
  }
  return parts.join(' > ')
}

/** Libellé court, pour se repérer d'un coup d'œil dans l'historique (dernier segment seul). */
export function shortElementLabel(el: Element): string {
  return segment(el, queryRoot(el))
}
