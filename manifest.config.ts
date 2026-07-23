import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

export default defineManifest(({ mode }) => ({
  manifest_version: 3,
  name: 'DevWind v3',
  version: pkg.version,
  description: 'Éditeur visuel de classes Tailwind CSS v3, en direct dans le navigateur.',
  // Fichiers dans public/icons/ : Vite copie déjà tout public/ tel quel à la racine de dist/
  // (public/icons/icon16.png -> dist/icons/icon16.png), donc les chemins ci-dessous sont
  // relatifs à dist/, pas au projet.
  icons: {
    16: 'icons/icon16.png',
    32: 'icons/icon32.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  action: {
    // Pas de default_popup : le clic sur l'icône ouvre/ferme directement la fenêtre devpanel
    // (voir src/background/service-worker.ts), un mini-popup intermédiaire n'a plus lieu
    // d'être maintenant que le panneau est une vraie fenêtre de navigateur séparée.
    default_icon: {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  commands: {
    'toggle-picker': {
      suggested_key: { default: 'Ctrl+Shift+K', mac: 'Command+Shift+K' },
      description: 'Activer/désactiver le picker DevWind',
    },
  },
  permissions: ['activeTab', 'scripting', 'storage'],
  // Pas de host_permissions au repos : le content script (dist/content/main.js, cf.
  // vite.content.config.ts) est injecté à la demande via chrome.scripting.executeScript (voir
  // src/core/activation.ts), qui ne marche sans geste utilisateur QUE si `activeTab` a été
  // activée par un clic sur l'icône ou le raccourci clavier — comportement volontaire, on ne
  // veut pas d'accès permanent à tous les sites.
  //
  // Exception en mode test (`vite build --mode test`, cf. tests/e2e/) : Playwright ne peut pas
  // simuler ce geste de façon fiable. `host_permissions` sur localhost donne à
  // `scripting.executeScript` un accès permanent à la fixture SANS geste utilisateur, en
  // gardant exactement le même chemin d'injection que la prod (même fichier, même mécanisme,
  // juste sans l'exigence de geste) — jamais présent dans le build de production.
  host_permissions: mode === 'test' ? ['http://localhost/*'] : undefined,
}))
