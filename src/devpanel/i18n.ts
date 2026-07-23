export type Language = 'fr' | 'en'

const STORAGE_KEY = 'devwind-language'

export async function loadLanguage(): Promise<Language> {
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  return stored[STORAGE_KEY] === 'en' ? 'en' : 'fr'
}

export async function setLanguage(lang: Language): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: lang })
}

export const NEXT_LANGUAGE: Record<Language, Language> = { fr: 'en', en: 'fr' }
export const LANGUAGE_LABEL: Record<Language, string> = { fr: 'FR', en: 'EN' }

/**
 * Traductions des libellés de catégorie/sous-catégorie de `taxonomy.ts` — celui-ci reste la
 * source de vérité (une seule chaîne par entrée, servant aussi de clé de regroupement dans
 * `devpanel/data.ts`), cette table ne fait QUE l'habillage d'affichage. Clé = valeur brute
 * actuelle dans `taxonomy.ts` (peu importe sa langue d'origine), donc aucune modification de
 * `taxonomy.ts`/du générateur n'est nécessaire pour ajouter la traduction manquante.
 */
const CATEGORY_LABELS: Record<string, Record<Language, string>> = {
  Spacing: { fr: 'Espacement', en: 'Spacing' },
  Sizing: { fr: 'Dimensions', en: 'Sizing' },
  Couleurs: { fr: 'Couleurs', en: 'Colors' },
  Typography: { fr: 'Typographie', en: 'Typography' },
  Layout: { fr: 'Mise en page', en: 'Layout' },
  'Bordures & Radius': { fr: 'Bordures & Radius', en: 'Borders & Radius' },
  Effets: { fr: 'Effets', en: 'Effects' },
  Filtres: { fr: 'Filtres', en: 'Filters' },
  'Transitions & Transforms': { fr: 'Transitions & Transformations', en: 'Transitions & Transforms' },
  Interactivité: { fr: 'Interactivité', en: 'Interactivity' },
}

const SUBCATEGORY_LABELS: Record<string, Record<Language, string>> = {
  // Spacing
  Padding: { fr: 'Padding', en: 'Padding' },
  Margin: { fr: 'Margin', en: 'Margin' },
  Gap: { fr: 'Gap', en: 'Gap' },
  // Sizing
  Width: { fr: 'Largeur', en: 'Width' },
  'Min Width': { fr: 'Largeur min.', en: 'Min Width' },
  'Max Width': { fr: 'Largeur max.', en: 'Max Width' },
  Height: { fr: 'Hauteur', en: 'Height' },
  'Min Height': { fr: 'Hauteur min.', en: 'Min Height' },
  'Max Height': { fr: 'Hauteur max.', en: 'Max Height' },
  // Couleurs
  Background: { fr: 'Fond', en: 'Background' },
  Texte: { fr: 'Texte', en: 'Text' },
  Border: { fr: 'Bordure', en: 'Border' },
  Ring: { fr: 'Ring', en: 'Ring' },
  Divide: { fr: 'Séparateurs', en: 'Divide' },
  // Typography
  Taille: { fr: 'Taille', en: 'Size' },
  Poids: { fr: 'Poids', en: 'Weight' },
  Alignement: { fr: 'Alignement', en: 'Alignment' },
  // Layout
  Display: { fr: 'Affichage', en: 'Display' },
  Position: { fr: 'Position', en: 'Position' },
  // Bordures & Radius
  Largeur: { fr: 'Largeur', en: 'Width' },
  Radius: { fr: 'Radius', en: 'Radius' },
  // Effets
  Shadow: { fr: 'Ombre', en: 'Shadow' },
  Opacity: { fr: 'Opacité', en: 'Opacity' },
  Blend: { fr: 'Fusion', en: 'Blend' },
  'Blend arrière-plan': { fr: 'Fusion arrière-plan', en: 'Backdrop Blend' },
  // Filtres
  Blur: { fr: 'Flou', en: 'Blur' },
  Brightness: { fr: 'Luminosité', en: 'Brightness' },
  Contrast: { fr: 'Contraste', en: 'Contrast' },
  Grayscale: { fr: 'Niveaux de gris', en: 'Grayscale' },
  'Hue Rotate': { fr: 'Teinte', en: 'Hue Rotate' },
  Invert: { fr: 'Inversion', en: 'Invert' },
  Saturate: { fr: 'Saturation', en: 'Saturate' },
  Sepia: { fr: 'Sépia', en: 'Sepia' },
  'Backdrop Blur': { fr: 'Flou arrière-plan', en: 'Backdrop Blur' },
  'Backdrop Brightness': { fr: 'Luminosité arrière-plan', en: 'Backdrop Brightness' },
  'Backdrop Contrast': { fr: 'Contraste arrière-plan', en: 'Backdrop Contrast' },
  'Backdrop Grayscale': { fr: 'Niveaux de gris arrière-plan', en: 'Backdrop Grayscale' },
  'Backdrop Hue Rotate': { fr: 'Teinte arrière-plan', en: 'Backdrop Hue Rotate' },
  'Backdrop Invert': { fr: 'Inversion arrière-plan', en: 'Backdrop Invert' },
  'Backdrop Opacity': { fr: 'Opacité arrière-plan', en: 'Backdrop Opacity' },
  'Backdrop Saturate': { fr: 'Saturation arrière-plan', en: 'Backdrop Saturate' },
  'Backdrop Sepia': { fr: 'Sépia arrière-plan', en: 'Backdrop Sepia' },
  // Transitions & Transforms
  Property: { fr: 'Propriété', en: 'Property' },
  Duration: { fr: 'Durée', en: 'Duration' },
  Timing: { fr: 'Timing', en: 'Timing' },
  Delay: { fr: 'Délai', en: 'Delay' },
  Animation: { fr: 'Animation', en: 'Animation' },
  Scale: { fr: 'Échelle', en: 'Scale' },
  Rotate: { fr: 'Rotation', en: 'Rotate' },
  Translate: { fr: 'Translation', en: 'Translate' },
  Skew: { fr: 'Inclinaison', en: 'Skew' },
  Origin: { fr: 'Origine', en: 'Origin' },
  // Interactivité
  Cursor: { fr: 'Curseur', en: 'Cursor' },
  Select: { fr: 'Sélection', en: 'Select' },
  'Pointer events': { fr: 'Événements pointeur', en: 'Pointer Events' },
  Resize: { fr: 'Redimensionnement', en: 'Resize' },
  Accent: { fr: 'Accent', en: 'Accent' },
  Scroll: { fr: 'Défilement', en: 'Scroll' },
}

/** Retombe sur la chaîne brute si jamais une entrée de taxonomy.ts n'a pas encore sa traduction
 * (ex. ajout futur non encore répertorié) — dégradation silencieuse plutôt qu'un trou d'affichage. */
export function translateCategory(raw: string, lang: Language): string {
  return CATEGORY_LABELS[raw]?.[lang] ?? raw
}

export function translateSubcategory(raw: string, lang: Language): string {
  return SUBCATEGORY_LABELS[raw]?.[lang] ?? raw
}
