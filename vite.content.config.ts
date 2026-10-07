import { defineConfig } from 'vite'

// Build séparé, minimal (pas de plugin CRXJS ni React : le content script n'a pas de JSX),
// spécifiquement pour le content script.
// Raison : ce fichier est injecté à la demande via chrome.scripting.executeScript({ files }),
// qui exécute le fichier comme un script classique — pas un module ES. Le build principal
// (vite.config.ts) produit toujours des chunks ESM avec imports partagés, ce qui casserait
// l'injection. Ici on force IIFE + tout inliné dans un seul fichier autonome.
export default defineConfig(({ mode }) => ({
  build: {
    outDir: mode === 'test' ? 'dist-test' : 'dist', // garder en phase avec vite.config.ts
    emptyOutDir: false, // ne pas effacer la sortie du build principal (vite.config.ts), lancé avant
    // Le code-splitting est impossible ici (pas juste indésirable) : `inlineDynamicImports`
    // ci-dessous exige explicitement un seul fichier, imposé par `executeScript({ files })` qui
    // injecte un script classique unique. Seuil volontairement bas : le content script ne doit
    // embarquer ni la taxonomie ni le dataset (calculs faits côté devpanel), un avertissement
    // signale une régression.
    chunkSizeWarningLimit: 50,
    rollupOptions: {
      input: { content: 'src/content/main.ts' },
      output: {
        format: 'iife',
        entryFileNames: 'content/main.js',
        inlineDynamicImports: true,
      },
    },
  },
}))
