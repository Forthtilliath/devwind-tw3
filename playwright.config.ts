import { defineConfig } from '@playwright/test'

// Tester une extension Chrome exige un vrai profil Chromium persistant en mode "headed" (pas
// le navigateur isolé par défaut de Playwright) — géré par tests/e2e/fixtures/extension.ts,
// pas par la config `use.browserName` standard. Nécessite `npm run build:test` au préalable
// (voir package.json) : construit dist-test/ avec le hook de test + le content script
// statiquement déclaré (cf. manifest.config.ts, service-worker.ts).
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
})
