import type { Message } from './types'

// Textes de l'interface du panneau (source des clés : messages-en.ts doit toutes les fournir).
// `{nom}` est remplacé par le paramètre du même nom ; `{ one, other }` choisit selon `count`.
export const fr = {
  'panel.selectHint': 'Clique sur un élément de la page pour éditer ses classes.',
  'panel.detachedHint': "L'élément sélectionné a été retiré de la page (re-rendu ?) — clique à nouveau dessus pour continuer.",
  'panel.count': { one: '<{tag}> · {count} classe', other: '<{tag}> · {count} classes' },
  'panel.noClasses': 'Aucune classe sur cet élément.',
  'panel.invalidTab': "Ce panneau s'ouvre depuis l'icône DevWind d'un onglet (paramètre tabId manquant).",

  'header.theme': 'Thème : {theme}',
  'header.themeTitle': 'Thème : {theme} (clic pour changer)',
  'header.theme.auto': 'automatique',
  'header.theme.light': 'clair',
  'header.theme.dark': 'sombre',
  'header.language': "Langue de l'interface : {language}",
  'header.languageTitle': "Langue de l'interface (clic pour changer)",
  'header.lock': 'Verrouiller la sélection',
  'header.lockTitle.locked': 'Déverrouiller (reprendre la sélection au survol/clic)',
  'header.lockTitle.unlocked': 'Verrouiller la sélection (interagir avec la page sans la perdre)',
  'header.undo': 'Annuler la dernière modification (Ctrl+Z)',
  'header.redo': 'Rétablir la modification annulée (Ctrl+Maj+Z)',

  'copy.trigger': 'Copier ▾',
  'copy.copied': 'Copié !',
  'copy.label': 'Copier les classes',
  'copy.plain': 'Classes',
  'copy.jsx': 'JSX (className="…")',

  'disconnected.title': 'Page fermée ou rechargée',
  'disconnected.body': 'Ce panneau a perdu le contact avec la page.',
  'disconnected.reconnect': 'Reconnecter',
  'disconnected.reconnecting': 'Reconnexion…',
  'disconnected.failed':
    "Chrome a retiré l'accès à la page à son rechargement (permission activeTab) : clique sur l'icône DevWind (ou Ctrl+Maj+K) dans l'onglet de la page pour reconnecter ce panneau.",
  'disconnected.showPage': 'Afficher la page',

  'error.title': 'Le panneau a rencontré une erreur inattendue.',
  'error.reload': 'Recharger le panneau',

  'breadcrumb.label': "Ancêtres de l'élément sélectionné",
  'contrast.label': 'Contraste texte/fond :',
  'contrast.title': 'Ratio {ratio}:1 ({size}) — AA {aa} · AAA {aaa}',
  'contrast.largeText': 'texte large',
  'contrast.normalText': 'texte normal',
  'contrast.approximate': ' — approximatif : dégradé/image de fond, opacité, filtre ou mode de fusion non pris en compte',

  'variants.breakpointTitle': 'À partir de {width}',
  'variants.more': 'Plus de variants',
  'variants.reset': 'Réinitialiser',
  'variants.resetLabel': 'Réinitialiser les variants',
  'variants.removeCustom': 'Retirer le variant {variant}',
  'variants.customPlaceholder': 'autre… (aria-checked, data-[open])',
  'variants.customLabel': 'Ajouter un autre variant',

  'recent.label': 'Récent :',

  'search.placeholder': 'Rechercher une classe ou une valeur (bg-red, p-4, 16px)… (Ctrl/Cmd+F)',
  'search.label': 'Rechercher une classe',
  'search.more': { one: '+{count} autre résultat — affine la recherche', other: '+{count} autres résultats — affine la recherche' },
  'search.fuzzy': 'Aucun résultat exact — suggestions approchées :',
  'search.none': 'Aucun résultat pour « {query} ».',

  'chip.remove': 'Retirer {cls}',
  'chip.unsupported': 'Sans effet prévisualisable',
  'chip.unsupportedTitle':
    "Pas d'effet visuel prévisualisable : ce variant n'est pas synthétisable (ex. dark: sans stratégie détectable). La classe est bien appliquée, mais ne s'affichera que si le CSS réel du site la définit.",

  'category.resize': 'Redimensionner la colonne des catégories',
  'category.resizeTitle': 'Glisser ou ←/→ pour redimensionner (double-clic ou Entrée pour réinitialiser)',

  'property.value': '{label} : {value}',
  'property.none': 'aucune valeur',
  'property.default': 'défaut',
  'property.arbitraryColor': '#hex ou css…',
  'property.arbitrary': 'valeur css…',

  'picker.filter': 'Rechercher…',
  'picker.filterLabel': 'Filtrer les valeurs',
  'picker.empty': 'Aucun résultat',
  'picker.arbitraryLabel': 'Valeur arbitraire',
  'picker.arbitrarySubmit': 'Appliquer la valeur arbitraire',

  'custom.summary': 'Custom / Autres classes ({count})',
  'custom.unscannable': { one: '{count} feuille non scannable', other: '{count} feuilles non scannables' },
  'custom.prefix': 'préfixe détecté : {prefix}',
  'custom.prefixTitle':
    "Détecté par heuristique : les classes de ce site semblent préfixées (option `prefix` de Tailwind). Le préfixe fait partie intégrante du nom de classe en v3 (ex. `tw-bg-red-500`), donc ces classes ne sont pas reconnues comme du Tailwind standard — elles restent listées ici en tant que classes custom plutôt que d'apparaître dans les catégories.",
  'custom.empty': 'Aucune classe custom détectée sur cette page.',

  'history.trigger': { one: 'Historique de la session ({count} modification)', other: 'Historique de la session ({count} modifications)' },
  'history.title': 'Historique de la session',
  'history.copy': 'Copier',
  'history.copyTitle': 'Copier les modifications appliquées (sélecteur : +ajout −retrait)',
  'history.copyFinal': 'Classes finales',
  'history.copyFinalTitle': 'Copier les classes finales de tous les éléments modifiés',
  'history.copied': 'Copié !',
  'history.clear': 'Vider',
  'history.empty': 'Aucune modification cette session.',
  'history.undo': 'Annuler',
  'history.redo': 'Rétablir',
  'history.undoLabel': 'Annuler la modification de {element}',
  'history.redoLabel': 'Rétablir la modification de {element}',

  'notice.revertDetached': "Impossible : l'élément n'est plus dans la page.",
  'notice.revertModified': "Impossible : ces classes ont été modifiées depuis — annule d'abord les modifications plus récentes.",
  'notice.nothingToUndo': 'Rien à annuler.',
  'notice.nothingToRedo': 'Rien à rétablir.',
  'notice.finalEmpty': 'Aucun élément modifié à exporter.',
  'notice.copyFailed': 'Copie refusée par le navigateur.',
  'notice.dismiss': 'Fermer',
} satisfies Record<string, Message>

export type MessageKey = keyof typeof fr
