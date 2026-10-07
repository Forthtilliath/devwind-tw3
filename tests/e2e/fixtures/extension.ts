import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as base, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXTENSION_PATH = path.resolve(__dirname, '../../../dist-test')
const PAGES_DIR = path.join(__dirname, 'pages')
const SERVER_PORT = 8990

/** Chemin du fichier demandé, ou `null` s'il sortirait de `PAGES_DIR` (`/../…`, `%2e%2e%2f…`)
 * ou si l'URL est mal encodée. La query string est ignorée. */
function resolvePagePath(url: string | undefined): string | null {
  let pathname: string
  try {
    pathname = decodeURIComponent(new URL(url ?? '/', 'http://localhost').pathname)
  } catch {
    return null
  }
  const filePath = path.resolve(PAGES_DIR, `.${pathname}`)
  return filePath.startsWith(PAGES_DIR + path.sep) ? filePath : null
}

interface Fixtures {
  context: BrowserContext
  serviceWorker: Worker
  /** Ouvre `tests/e2e/fixtures/pages/<name>` et déclenche l'ouverture de la fenêtre devpanel
   * pour cet onglet (via le hook de test, cf. src/background/service-worker.ts) — retourne
   * la page de contenu ET la page du devpanel. */
  openFixture: (name: string) => Promise<{ page: Page; devpanel: Page }>
}

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    if (!fs.existsSync(EXTENSION_PATH)) {
      throw new Error(`Build de test introuvable (${EXTENSION_PATH}) — lance "npm run build:test" avant les tests e2e.`)
    }
    const server = http.createServer((req, res) => {
      const filePath = resolvePagePath(req.url)
      if (!filePath) {
        res.writeHead(400)
        res.end('bad request')
        return
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404)
          res.end('not found')
          return
        }
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(data)
      })
    })
    await new Promise<void>((resolve) => server.listen(SERVER_PORT, resolve))

    // Mode sombre pour ménager les yeux pendant les runs "headed" : UI Chrome sombre, media
    // `prefers-color-scheme: dark` émulé, et assombrissement forcé des fixtures en HTML brut
    // (appliqué au rendu uniquement — `getComputedStyle` et le DOM restent inchangés).
    // Navigateur en français : le panneau prend la langue du navigateur tant qu'aucune n'a été
    // choisie (cf. src/devpanel/i18n/), et les tests ciblent les libellés français.
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      colorScheme: 'dark',
      locale: 'fr-FR',
      args: [
        '--lang=fr-FR',
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--force-dark-mode',
        '--enable-features=WebContentsForceDark',
      ],
    })

    await use(context)

    await context.close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  },

  serviceWorker: async ({ context }, use) => {
    let [sw] = context.serviceWorkers()
    if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 10000 })
    await use(sw)
  },

  openFixture: async ({ context, serviceWorker }, use) => {
    await use(async (name: string) => {
      const page = await context.newPage()
      await page.goto(`http://localhost:${SERVER_PORT}/${name}`)

      const tabId = await serviceWorker.evaluate(async () => {
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
        const id = tabs[0]?.id
        if (id == null) throw new Error('Aucun onglet actif trouvé.')
        return id
      })
      // @ts-expect-error -- hook de test, présent uniquement dans le build `--mode test`
      await serviceWorker.evaluate((id) => self.__devwindTestToggle(id), tabId)

      const devpanel = await waitForDevpanelPage(context)
      return { page, devpanel }
    })
  },
})

async function waitForDevpanelPage(context: BrowserContext, timeout = 5000): Promise<Page> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const found = context.pages().find((p) => p.url().includes('devpanel.html'))
    if (found) return found
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('La fenêtre devpanel ne s’est pas ouverte à temps.')
}

export { expect } from '@playwright/test'
