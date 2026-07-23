# Idées d'amélioration — DevWind v3

Fork de [devwind](https://github.com/Forthtilliath/devwind) (qui cible Tailwind v4), adapté pour cibler **Tailwind v3**. Historique git repartie de zéro (voir le repo v4 pour l'historique complet du développement des fonctionnalités communes) ; ce document reprend l'état des lieux au moment du fork, ajusté pour v3.

## Couverture de la taxonomie — ✅ fait

- Table `taxonomy.ts` complète (~35 entrées couvrant Spacing, Sizing, Couleurs, Typography, Layout, Bordures & Radius, Effets, Filtres, Transitions & Transforms, Interactivité), dataset généré automatiquement (`scripts/generate-tailwind-data.ts`) via `resolveConfig` de Tailwind v3 — jamais de classe tapée en dur. ~4800 classes générées sur le thème par défaut v3.
- `line-height` associé à `fontSize` — `GeneratedClass.secondaryValue` porte le line-height apparié, utilisé littéralement par `live-style.ts` (v3 n'a pas de variable CSS runtime à référencer, contrairement à v4).
- Ambiguïté théorique sur préfixes partagés (`text-`, `border-`) si un thème custom nomme une clé de couleur comme une clé de taille — non traité, edge case qui ne s'applique qu'à un thème personnalisé (hors scope, thème par défaut uniquement).
- **`ring`/`shadow` restent simplifiés** (`box-shadow` direct, pas composé avec le vrai mécanisme multi-sources de Tailwind) — simplification volontaire assumée, cas de composition simultanée ring+shadow rare.

## Synthèse CSS live (`live-style.ts`) — ✅ fait

- `dark:` — double émission (`@media (prefers-color-scheme: dark)` ET `:where(.dark, .dark *)`), avec l'ordre d'émission qui suit la stratégie réellement active sur la page (`.dark` présent sur `<html>`/`<body>` ou non) pour gagner face à du vrai CSS du site à spécificité égale.
- `group-*`, `peer-*`, `aria-*`, `data-*`, `has-*` — tous purement déclaratifs via combinateurs/sélecteurs CSS standards, pas besoin d'inspecter le DOM.
- Modificateur d'opacité sur les couleurs (`bg-red-500/80`, `bg-[#ff0000]/50`) — synthétisé via `color-mix()`.
- Plafond simple sur les règles injectées (purge des plus anciennes au-delà de 300).
- **Propriétés composites (transform/filter/backdrop-filter), fidèles à v3** : `scale`/`rotate`/`translate`/`skew` sont TOUS composés via une seule propriété `transform` partagée (contrairement à v4 qui les a séparées en propriétés natives) — chaque classe pose sa variable `--tw-*` et réaffirme la formule complète, permettant à n'importe quelle combinaison de classes de fonctionner par cascade. Vérifié en reprenant l'implémentation originale de devwind (avant sa migration v4, cf. son historique git commit `6b246d1`), qui s'est avérée être un modèle v3 correct.
- **Valeurs littérales** : contrairement à v4 (variables CSS `@theme` runtime avec fallback), Tailwind v3 compile chaque classe avec sa valeur de thème inlinée en dur — pas de détection de thème custom du site possible sans parser son CSS compilé (hors scope).

## Accessibilité — ✅ fait

- **Indicateur de contraste WCAG** — pendant l'édition, un badge affiche le ratio texte/fond de l'élément sélectionné (`AA`/`AAA`/✗ selon les seuils WCAG 2.1, texte large pris en compte). Dans les popovers Background/Texte, chaque couleur candidate affiche aussi son ratio en aperçu avant même de cliquer dessus. Conversion couleur → RGB via canvas 2D détaché (`fillStyle` + `getImageData`), robuste à n'importe quelle syntaxe CSS (utile même si v3 est hex par défaut, un site peut définir ses propres couleurs custom dans n'importe quelle syntaxe).

## Édition / historique

- ~~Pas de vue d'ensemble des modifications de la page~~ — historique de session accessible depuis l'en-tête (icône 🕘 + compteur) : chaque ajout/retrait de classe, sur N'IMPORTE QUEL élément de la page, est loggué avec un descriptif léger de l'élément touché et un diff `+classe`/`−classe`. Copiable, vidable, plafonné à 300 entrées.
- **Pas fait** : undo/redo à proprement parler (annuler une entrée précise de l'historique) — la liste est en lecture seule.
- Pas de multi-sélection, pas de réordonnancement des chips, édition de classes custom limitée à toggle on/off.

## Panneau / UX — ✅ fait

- Thème clair/sombre du panneau, raccourcis clavier (`Ctrl/Cmd+F`, flèches dans les popovers), classes récemment utilisées, icônes de côté pour les préfixes multiples, indicateur de classe non synthétisée, export texte brut/JSX.
- Rail de catégories redimensionnable par glisser-déposer (72–220px, double-clic pour réinitialiser), largeur par défaut 150px pour que tous les libellés tiennent sur une ligne.
- Libellés de catégorie/sous-catégorie en français ou anglais (toggle FR/EN dans l'en-tête, persisté) — table de traduction dans `devpanel/i18n.ts`, séparée de `taxonomy.ts`.

## Picker / sélection d'élément — ✅ fait

- Fil d'ariane des ancêtres, navigation clavier, mode verrouillé (bouton 🔒 ou `Échap` directement sur la page) pour interagir avec la page sans perdre la sélection.

## Scan CSS — ✅ fait

- Fallback `fetch()` pour les feuilles cross-origin autorisant CORS, re-scan automatique (debounced) si le site charge du CSS dynamiquement.

## Compatibilité Tailwind — ✅ fait (v3)

- ~~Dataset ciblé Tailwind v4~~ — ce fork cible Tailwind v3 (`resolveConfig`, couleurs hex par défaut). Voir [devwind](https://github.com/Forthtilliath/devwind) pour la version v4 (OKLCH, variables `@theme`).
- **Pas dans cette version** : prise en compte d'un thème customisé du site (v3 ne l'expose pas en variables CSS runtime, il faudrait parser son CSS compilé — hors scope) ; détection de préfixe de site (syntaxe v3 `tw-bg-red-500`, tiret collé — algorithme différent de la détection v4 `tw:bg-red-500`, retirée de ce fork plutôt qu'adaptée pour ce premier jet, pourrait être ajoutée si le besoin se présente).

## Qualité / process — ✅ fait

- Suite de tests e2e Playwright (`tests/e2e/`) : parcours principal (sélection, édition, retrait de classe, scan CSS custom), historique de session, redimensionnement du rail, Échap→verrouillage, toggle FR/EN, composition `transform` v3 (scale+rotate simultanés).
- Icônes générées aux 4 tailles requises (dégradé ambre, pour se distinguer visuellement de la version v4 en indigo si les deux extensions sont chargées en même temps).
- README, CI (lint + build sur push/PR), release automatisée (`npm version patch/minor/major` → tag → build + zip + Release GitHub avec notes catégorisées par type de commit).

## Nouvelles idées

- Réécrire `detectSitePrefix` pour la syntaxe de préfixe v3 (tiret collé) si le besoin d'un site préfixé se présente.
- `tracking-*`/`leading-*` (letter-spacing / line-height autonome) absents de la taxonomie, comme dans le projet v4 d'origine.
