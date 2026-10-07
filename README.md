# DevWind v3

![License](https://img.shields.io/github/license/forthtilliath/devwind-tw3?style=for-the-badge) [![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/) ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/-TypeScript-blue?logo=typescript&logoColor=white&style=for-the-badge) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) [![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/) [![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/forthtilliath)

Extension Chrome pour éditer visuellement les classes Tailwind CSS de n'importe quel site, en direct dans le navigateur — dans l'esprit de l'ancienne extension Gimli (discontinuée), avec une meilleure organisation des classes et la prise en charge des classes custom du site.

Cible **Tailwind CSS v3** (thème par défaut résolu via `resolveConfig`, couleurs en hex, classes compilées avec leurs valeurs inlinées en dur — pas de variables CSS `@theme` runtime comme en v4).

Fork de [devwind](https://github.com/Forthtilliath/devwind), qui cible Tailwind v4 — projet séparé plutôt qu'un mode bascule, pour ne pas mélanger deux jeux de classes (v3 hex vs v4 oklch/variables) dans le même bundle.

## Fonctionnalités

- **Picker visuel** : clic sur l'icône ou `Ctrl+Shift+K` pour activer le picker, clic sur un élément de la page pour sélectionner ce qu'on veut éditer. Surbrillance façon DevTools (dimensions, marge et padding, survol en pointillé / sélection en trait plein), fil d'ariane des ancêtres, navigation clavier (flèches), mode verrouillé pour interagir avec la page sans perdre la sélection (bouton 🔒 ou `Échap` directement sur la page).
- **Panneau dans une fenêtre séparée**, déplaçable indépendamment (utile sur un second écran) : classes regroupées par catégorie (couleurs, spacing, typographie, bordures, effets, filtres, transitions, interactivité...) dans un rail redimensionnable, valeurs récentes, export en texte brut ou JSX.
- **Aperçu au survol** : survoler une valeur dans la liste d'une propriété l'applique temporairement sur la page, sans rien enregistrer ; le clic la valide.
- **Recherche transversale** : résultats classés (exact, puis début de nom…), recherche par valeur CSS (`16px` → `p-4`, `#ef4444` → `bg-red-500`…), suggestions tolérantes aux fautes de frappe.
- **Variants** : breakpoints réels du site (lus dans les media queries de son CSS compilé), pseudo-classes courantes en accès direct (`hover`, `focus-visible`, `group-hover`, `first`…), variant libre, réinitialisation en un clic.
- **Historique de session et annuler/rétablir** : chaque ajout/retrait de classe, sur n'importe quel élément de la page (pas juste la sélection courante), est loggué avec un diff `+classe`/`−classe`. `Ctrl+Z` / `Ctrl+Shift+Z` (ou les boutons ↶ ↷), annulation d'une entrée précise depuis l'historique. Export des modifications ou des classes finales de tous les éléments modifiés, chacun repéré par un sélecteur CSS unique.
- **Synthèse CSS live** : une classe choisie dans le panneau produit un effet visuel immédiat même si elle est absente du CSS déjà chargé sur la page (build de prod purgé) — variants `hover:`, `dark:`, breakpoints, `group-*`/`peer-*`, `aria-*`, `has-*`, `data-*`, opacité de couleur (`bg-red-500/80`), propriétés composites (transform/filter/backdrop-filter, toutes composées via une seule propriété `transform` partagée comme le vrai moteur v3) synthétisées fidèlement.
- **Scan CSS** : détecte les classes custom (non-Tailwind) utilisées sur la page en parsant les feuilles de style chargées (avec repli `fetch()` pour le cross-origin autorisant CORS), re-scanne automatiquement si le site charge du CSS dynamiquement. Signale un préfixe de site (`tw-bg-red-500`, option `prefix` de v3).
- **Contrôle de contraste WCAG** : ratio texte/fond de l'élément sélectionné (AA/AAA), aperçu du contraste par couleur candidate avant de l'appliquer.
- Interface en français ou en anglais (langue du navigateur par défaut, toggle FR/EN), thème clair/sombre du panneau, raccourcis clavier, indicateur de classe non synthétisable, reconnexion en un clic après rechargement de la page quand Chrome le permet.

**Pas dans cette version** (spécifique à v4) : navigateur de variables de thème — v3 n'expose pas son thème en CSS runtime.

Bugs et idées d'amélioration : [issues GitHub](../../issues).

## Installation

**Depuis une Release** (le plus simple, pas besoin de builder) : télécharger le zip attaché à la [dernière release GitHub](../../releases/latest), l'extraire, puis dans Chrome : `chrome://extensions` → activer le *mode développeur* → *Charger l'extension non empaquetée* → sélectionner le dossier extrait.

**Depuis les sources** :

```sh
npm install
npm run build
```

Puis charger le dossier `dist/` de la même façon.

## Utilisation

1. Clic sur l'icône DevWind (ou `Ctrl+Shift+K`) sur la page à éditer : ouvre la fenêtre du panneau et active le picker.
2. Clic sur un élément de la page pour l'éditer.
3. Modifier ses classes depuis le panneau — les changements s'appliquent en direct sur la page.

## Développement

```sh
npm run dev     # build en mode watch (HMR pour le panneau)
npm run lint    # oxlint
npm test        # tests unitaires (Vitest)
npm run build   # build de production dans dist/
```

Le dataset de classes (`src/data/generated/`, non versionné) est régénéré automatiquement avant chaque `dev`, `build` et `test` (`npm run generate:tw-data`) à partir du thème par défaut Tailwind v3 (`resolveConfig`) croisé avec la taxonomie éditée à la main (`src/data/taxonomy/`) — jamais de classe tapée en dur.

### Structure

- `src/core/` — logique indépendante du DOM/React : parsing de classes, diff, synthèse CSS live, scan CSS, contraste WCAG.
- `src/content/` — content script injecté à la demande sur la page éditée. Volontairement léger (~17 Ko) : il n'embarque ni la taxonomie ni le dataset ; le panneau calcule le diff de classes et le CSS de prévisualisation, la page se contente de les appliquer.
- `src/devpanel/` — l'interface React du panneau (fenêtre séparée).
- `src/background/` — service worker (activation, raccourcis).
- `src/data/taxonomy/` — la seule table éditée à la main (un fichier par catégorie) ; `scripts/generate-tailwind-data.ts` en dérive le dataset complet des classes.

### Tests

Tests unitaires Vitest de `src/core/` (parsing, diff, synthèse CSS, variants, contraste, validation des messages) :

```sh
npm test
```

Suite e2e Playwright, extension chargée dans un vrai Chromium :

```sh
npm run test:e2e   # build un dist-test/ dédié, puis lance les tests
```

Le build de test (`npm run build:test`) diffère du build de production sur deux points seulement, tous deux absents en production (vérifié : éliminés au build par Vite via `import.meta.env.MODE`) :
- un hook (`self.__devwindTestToggle`) pour ouvrir le panneau sans dépendre d'un geste utilisateur, que Playwright ne peut pas simuler de façon fiable ;
- `host_permissions` sur `http://localhost/*`, pour que l'injection du content script marche sans ce même geste.

### Publier une release

Rien n'est poussé directement sur `main` : la release passe par une PR, puis le tag est posé après intégration (le rebase réécrit les SHA).

```sh
npm version patch   # ou minor / major — depuis main propre et à jour
# … intégrer la PR ouverte (rebase), puis :
npm run release:tag
```

1. `preversion` — vérifie qu'on est sur `main` propre et aligné sur `origin/main`, puis lint + tests + type-check ; annule tout si ça échoue (rien n'est bumpé).
2. `npm version` bump `package.json`/`package-lock.json` sans commit ni tag (`.npmrc` : `git-tag-version=false`).
3. `postversion` — crée la branche `release/vX.Y.Z`, commit `chore: release vX.Y.Z`, pousse la branche et ouvre la PR.
4. `npm run release:tag` — met `main` à jour, tague le commit de release (`vX.Y.Z`) et pousse le tag, ce qui déclenche `.github/workflows/release.yml`.

Le workflow `.github/workflows/release.yml` build, zippe `dist/` et publie automatiquement une Release GitHub avec le zip en pièce jointe.

## Soutenir le projet

DevWind est gratuit et le restera. Si l'extension t'a fait gagner du temps, un café est toujours apprécié ☕

[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://buymeacoffee.com/forthtilliath)
