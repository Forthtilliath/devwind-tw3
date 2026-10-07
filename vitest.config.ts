import { defineConfig } from 'vitest/config'

// Config séparée de vite.config.ts : les tests unitaires de `src/core/` n'ont besoin ni du
// plugin CRXJS ni de React. Environnement Node par défaut ; un fichier qui manipule un élément
// DOM le demande lui-même (`// @vitest-environment happy-dom`).
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
})
