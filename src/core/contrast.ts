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

/** Convertit n'importe quelle syntaxe de couleur CSS valide en RGB 0-255 concrets. */
export function cssColorToRgb(css: string): Rgb | null {
  const probe = ensureProbe()
  if (!probe) return null
  probe.style.color = ''
  probe.style.color = css
  if (!probe.style.color) return null // valeur invalide, rejetée par le CSSOM

  const ctx = ensureCanvasCtx()
  if (!ctx) return null
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = probe.style.color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return { r, g, b }
}

export interface WcagRating {
  ratio: number
  /** ≥24px, ou ≥18.66px (~14pt) en gras — seuils WCAG du "texte large". */
  isLargeText: boolean
  aa: boolean
  aaa: boolean
}

/** Note un couple texte/fond selon les seuils WCAG 2.1 (AA : 4.5:1 texte normal / 3:1 texte
 * large ; AAA : 7:1 / 4.5:1). `null` si une des deux couleurs n'a pas pu être analysée
 * (ex. `transparent` sans fallback). */
export function rateContrast(foreground: string, background: string, fontSizePx: number, bold: boolean): WcagRating | null {
  const fg = cssColorToRgb(foreground)
  const bg = cssColorToRgb(background)
  if (!fg || !bg) return null
  const ratio = contrastRatio(fg, bg)
  const isLargeText = fontSizePx >= 24 || (fontSizePx >= 18.66 && bold)
  return {
    ratio,
    isLargeText,
    aa: ratio >= (isLargeText ? 3 : 4.5),
    aaa: ratio >= (isLargeText ? 4.5 : 7),
  }
}
