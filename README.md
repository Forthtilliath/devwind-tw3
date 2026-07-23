# DevWind v3

Extension Chrome pour éditer visuellement les classes Tailwind CSS de n'importe quel site, en direct dans le navigateur — dans l'esprit de l'ancienne extension Gimli (discontinuée), avec une meilleure organisation des classes et la prise en charge des classes custom du site.

Cible **Tailwind CSS v3** (thème par défaut résolu via `resolveConfig`, couleurs en hex, classes compilées avec leurs valeurs inlinées en dur — pas de variables CSS `@theme` runtime comme en v4).

Fork de [devwind](https://github.com/Forthtilliath/devwind), qui cible Tailwind v4 — projet séparé plutôt qu'un mode bascule, pour ne pas mélanger deux jeux de classes (v3 hex vs v4 oklch/variables) dans le même bundle.

## Fonctionnalités

- **Picker visuel** : clic sur l'icône ou `Ctrl+Shift+K` pour activer le picker, clic sur un élément de la page pour sélectionner ce qu'on veut éditer. Fil d'ariane des ancêtres, navigation clavier (flèches), mode verrouillé pour interagir avec la page sans perdre la sélection (bouton 🔒 ou `Échap` directement sur la page).
- **Panneau dans une fenêtre séparée**, déplaçable indépendamment (utile sur un second écran) : classes regroupées par catégorie (couleurs, spacing, typographie, bordures, effets, filtres, transitions, interactivité...) dans un rail redimensionnable, recherche transversale, valeurs récentes, export en texte brut ou JSX.
- **Historique de session** : chaque ajout/retrait de classe, sur n'importe quel élément de la page (pas juste la sélection courante), est loggué avec un diff `+classe`/`−classe` — pratique pour retrouver l'ensemble des modifications faites à différents endroits avant de finaliser. Copiable, vidable.
- **Synthèse CSS live** : une classe choisie dans le panneau produit un effet visuel immédiat même si elle est absente du CSS déjà chargé sur la page (build de prod purgé) — variants `hover:`, `dark:`, breakpoints, `group-*`/`peer-*`, `aria-*`, `has-*`, `data-*`, opacité de couleur (`bg-red-500/80`), propriétés composites (transform/filter/backdrop-filter, toutes composées via une seule propriété `transform` partagée comme le vrai moteur v3) synthétisées fidèlement.
- **Scan CSS** : détecte les classes custom (non-Tailwind) utilisées sur la page en parsant les feuilles de style chargées (avec repli `fetch()` pour le cross-origin autorisant CORS), re-scanne automatiquement si le site charge du CSS dynamiquement.
- **Contrôle de contraste WCAG** : ratio texte/fond de l'élément sélectionné (AA/AAA), aperçu du contraste par couleur candidate avant de l'appliquer.
- Thème clair/sombre du panneau, libellés de catégorie en français ou anglais (toggle FR/EN, pas de mélange), raccourcis clavier, indicateur de classe non synthétisable.

**Pas dans cette version** (spécifiques à v4, non pertinents ou non adaptés pour v3) : navigateur de variables de thème (v3 n'expose pas son thème en CSS runtime), détection de préfixe de site (syntaxe de préfixe différente en v3, `tw-bg-red-500` au lieu de `tw:bg-red-500`).

Détail complet des fonctionnalités et idées futures : [UPGRADES.md](UPGRADES.md).

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
npm run build   # build de production dans dist/
```

Le dataset de classes (`src/data/generated/`) est régénéré automatiquement avant chaque build (`npm run generate:tw-data`) à partir du thème par défaut Tailwind v3 (`resolveConfig`) croisé avec la taxonomie éditée à la main (`src/data/taxonomy.ts`) — jamais de classe tapée en dur.

### Structure

- `src/core/` — logique indépendante du DOM/React : parsing de classes, diff, synthèse CSS live, scan CSS, contraste WCAG.
- `src/content/` — content script injecté à la demande sur la page éditée.
- `src/devpanel/` — l'interface React du panneau (fenêtre séparée).
- `src/background/` — service worker (activation, raccourcis).
- `src/data/taxonomy.ts` — la seule table éditée à la main ; `scripts/generate-tailwind-data.ts` en dérive le dataset complet des classes.

### Tests

Suite e2e Playwright, extension chargée dans un vrai Chromium :

```sh
npm run test:e2e   # build un dist-test/ dédié, puis lance les tests
```

Le build de test (`npm run build:test`) diffère du build de production sur deux points seulement, tous deux absents en production (vérifié : éliminés au build par Vite via `import.meta.env.MODE`) :
- un hook (`self.__devwindTestToggle`) pour ouvrir le panneau sans dépendre d'un geste utilisateur, que Playwright ne peut pas simuler de façon fiable ;
- `host_permissions` sur `http://localhost/*`, pour que l'injection du content script marche sans ce même geste.

### Publier une release

Une seule commande (working directory propre requis) :

```sh
npm version patch   # ou minor / major
```

`npm version` bump `package.json`, commit et tague (`vX.Y.Z`) en un coup ; les hooks `preversion`/`postversion` (voir `package.json`) font le reste automatiquement :
1. `preversion` — lint + type-check, annule tout si ça échoue (rien n'est bumpé/tagué).
2. `postversion` — pousse le commit ET le tag, ce qui déclenche `.github/workflows/release.yml` (build, zip, Release GitHub).

Le workflow `.github/workflows/release.yml` build, zippe `dist/` et publie automatiquement une Release GitHub avec le zip en pièce jointe.
