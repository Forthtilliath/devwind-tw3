export interface Rgb {
  r: number
  g: number
  b: number
}

function srgbToLinear(channel255: number): number {
  const c = channel255 / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** Luminance relative WCAG (0 = noir, 1 = blanc). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

/** Ratio de contraste WCAG entre deux couleurs (1 = aucun contraste, 21 = noir sur blanc). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// Élément détaché réutilisé pour valider n'importe quelle syntaxe de couleur CSS (le CSSOM vide
// `style.color` si la valeur est invalide) avant de la convertir en octets RGB via un canvas.
// `getComputedStyle` NE renormalise PAS toujours en `rgb(...)` : depuis les navigateurs récents,
// les couleurs "wide gamut" (`oklch(...)`, `lab(...)`...) — celles du thème par défaut Tailwind
// v4 — sont sérialisées telles quelles dans leur espace d'origine. Un canvas 2D, lui, doit bien
// convertir en pixels sRGB concrets pour dessiner, donc `getImageData` donne des octets fiables
// quelle que soit la syntaxe d'entrée (vérifié empiriquement : `oklch(...)` passe intact par
// `getComputedStyle` mais pas par le canvas).
let probeEl: HTMLElement | null = null
let canvasCtx: CanvasRenderingContext2D | null = null

function ensureProbe(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  if (!probeEl) {
    probeEl = document.createElement('div')
    probeEl.style.cssText = 'position:absolute; opacity:0; pointer-events:none; top:-9999px;'
    document.body.appendChild(probeEl)
  }
  return probeEl
}

function ensureCanvasCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (!canvasCtx) {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    canvasCtx = canvas.getContext('2d', { willReadFrequently: true })
  }
  return canvasCtx
}

export interface Rgba extends Rgb {
  /** 0 (transparent) à 1 (opaque). */
  a: number
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 }

// Résultats déjà convertis : une liste de couleurs dans un popover recalcule le contraste de
// chaque ligne à chaque rendu (survol), soit des centaines de `getImageData` sans ce cache. Les
// couleurs rencontrées sont en nombre limité (palette + couleurs de la page) ; le plafond ne
// sert que de garde-fou.
const MAX_CACHED_COLORS = 2000
const rgbaCache = new Map<string, Rgba | null>()

/** Convertit n'importe quelle syntaxe de couleur CSS valide en RGBA concrets (canaux 0-255,
 * alpha 0-1). `getImageData` renvoie des valeurs non prémultipliées : un pixel translucide garde
 * sa teinte (perte de précision négligeable sauf alpha très faible). */
export function cssColorToRgba(css: string): Rgba | null {
  const cached = rgbaCache.get(css)
  if (cached !== undefined) return cached
  const probe = ensureProbe()
  if (!probe) return null
  if (rgbaCache.size >= MAX_CACHED_COLORS) rgbaCache.clear()
  const result = convertWithCanvas(probe, css)
  rgbaCache.set(css, result)
  return result
}

function convertWithCanvas(probe: HTMLElement, css: string): Rgba | null {
  probe.style.color = ''
  probe.style.color = css
  if (!probe.style.color) return null // valeur invalide, rejetée par le CSSOM

  const ctx = ensureCanvasCtx()
  if (!ctx) return null
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = probe.style.color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
  return { r, g, b, a: a / 255 }
}

/** Composition « source-over » d'une couleur translucide sur un fond opaque (espace sRGB, comme
 * le rendu par défaut des navigateurs). */
export function compositeOver(top: Rgba, bottom: Rgb): Rgb {
  const mix = (t: number, b: number) => Math.round(t * top.a + b * (1 - top.a))
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b) }
}

/** Aplatit une pile de fonds (le plus proche du texte en premier) sur le blanc par défaut du
 * canevas. `null` si une couche est illisible : mieux vaut pas de verdict qu'un faux. */
export function flattenBackgrounds(layers: string[]): Rgb | null {
  let result = WHITE
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = cssColorToRgba(layers[i])
    if (!layer) return null
    result = compositeOver(layer, result)
  }
  return result
}

export interface WcagRating {
  ratio: number
  /** ≥24px, ou ≥18.66px (~14pt) en gras — seuils WCAG du "texte large". */
  isLargeText: boolean
  aa: boolean
  aaa: boolean
}

/** Note un couple texte/fond selon les seuils WCAG 2.1 (AA : 4.5:1 texte normal / 3:1 texte
 * large ; AAA : 7:1 / 4.5:1). `backgrounds` = pile de fonds, le plus proche du texte en premier :
 * les fonds translucides sont composés entre eux puis le texte (lui aussi éventuellement
 * translucide) sur le résultat, pour noter les couleurs réellement affichées. `null` si une
 * des couleurs n'a pas pu être analysée. */
export function rateContrast(foreground: string, backgrounds: string[], fontSizePx: number, bold: boolean): WcagRating | null {
  const fgRgba = cssColorToRgba(foreground)
  const bg = flattenBackgrounds(backgrounds)
  if (!fgRgba || !bg) return null
  const ratio = contrastRatio(compositeOver(fgRgba, bg), bg)
  const isLargeText = fontSizePx >= 24 || (fontSizePx >= 18.66 && bold)
  return {
    ratio,
    isLargeText,
    aa: ratio >= (isLargeText ? 3 : 4.5),
    aaa: ratio >= (isLargeText ? 4.5 : 7),
  }
}
