import { colorAlpha } from '../core/color-alpha'
import type { ElementColors } from '../types'

/** Effets qui modifient le rendu au-delà des simples couleurs de fond composées. */
function hasNonColorEffects(style: CSSStyleDeclaration): boolean {
  return style.backgroundImage !== 'none' || Number(style.opacity) < 1 || style.filter !== 'none' || style.mixBlendMode !== 'normal'
}

/** Pile de fonds effective : fond propre de l'élément + fonds non transparents des ancêtres
 * jusqu'au premier opaque (le devpanel les compose, puis sur blanc si toute la chaîne est
 * translucide, comportement de rendu par défaut). Les dégradés/images, opacités, filtres et
 * modes de fusion ne sont pas modélisés : simplement signalés via `approximate`. */
export function computeEffectiveColors(el: Element): ElementColors {
  const style = getComputedStyle(el)
  const backdrop: string[] = []
  let approximate = hasNonColorEffects(style)
  let opaque = colorAlpha(style.backgroundColor) >= 1
  let current = el.parentElement
  while (current && !opaque) {
    const ancestorStyle = getComputedStyle(current)
    if (hasNonColorEffects(ancestorStyle)) approximate = true
    const alpha = colorAlpha(ancestorStyle.backgroundColor)
    if (alpha > 0) backdrop.push(ancestorStyle.backgroundColor)
    opaque = alpha >= 1
    current = current.parentElement
  }
  return {
    color: style.color,
    backgroundColor: style.backgroundColor,
    backdrop,
    approximate,
    fontSize: parseFloat(style.fontSize),
    bold: Number(style.fontWeight) >= 700,
  }
}
