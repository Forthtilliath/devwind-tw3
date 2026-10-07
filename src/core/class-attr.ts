// `el.className` d'un élément SVG est un `SVGAnimatedString`, pas une string (`split` plante,
// `toString()` donne "[object SVGAnimatedString]") : on passe toujours par l'attribut `class`,
// qui se comporte de la même façon sur les éléments HTML et SVG.

export function getClassAttr(el: Element): string {
  return el.getAttribute('class') ?? ''
}

export function setClassAttr(el: Element, value: string): void {
  el.setAttribute('class', value)
}

export function readClassList(el: Element): string[] {
  return getClassAttr(el).split(/\s+/).filter(Boolean)
}
