import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config.ts'

// Build principal : background géré par CRXJS à partir du manifest, devpanel ajouté
// manuellement comme entrée HTML supplémentaire (chargée via chrome.windows.create, supporte
// les modules ES normalement — contrairement au content script, buildé séparément en IIFE,
// voir vite.content.config.ts, car injecté via chrome.scripting.executeScript).
export default defineConfig(({ mode }) => ({
  plugins: [react(), crx({ manifest })],
  server: {
    // Requis par CRXJS en dev : le service worker doit pouvoir joindre le serveur HMR.
    port: 5173,
    strictPort: true,
  },
  build: {
    // Mode 'test' (`npm run build:test`, cf. tests/e2e/) : sortie séparée de `dist/`, pour ne
    // jamais mélanger un build de test (hook Playwright + content_scripts statique, voir
    // manifest.config.ts et service-worker.ts) avec le build de production.
    outDir: mode === 'test' ? 'dist-test' : 'dist',
    // Le devpanel est une fenêtre d'extension chargée en local (chrome-extension://, depuis le
    // disque, sans latence réseau) — pas une page publique où chaque Ko compte pour le temps de
    // chargement perçu. Découper le bundle (React/Zustand à part, etc.) ajouterait de la
    // complexité pour un bénéfice quasi nul ici ; on relève juste le seuil d'avertissement au
    // lieu de forcer un split cosmétique.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        devpanel: fileURLToPath(new URL('./src/devpanel/devpanel.html', import.meta.url)),
      },
    },
  },
}))
