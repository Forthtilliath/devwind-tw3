import { expect, test } from './fixtures/extension.js'

test.describe("Ordre des règles dark: synthétisées", () => {
  test("suit la stratégie réellement active sur la page", async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('dark-strategy.html')
    await page.click('#dark-target')

    await devpanel.locator('.devwind-variant-pill', { hasText: 'dark' }).click()
    await devpanel.locator('#devwind-search-input').fill('bg-slate-900')
    await devpanel.locator('.devwind-value__label', { hasText: 'bg-slate-900' }).first().click()

    let injectedCss = await page.evaluate(() => document.getElementById('devwind-live-styles')?.textContent ?? '')
    // Pas de classe .dark sur la page : la règle média doit être émise en dernier (gagne à
    // spécificité égale).
    expect(injectedCss.indexOf('@media (prefers-color-scheme')).toBeGreaterThan(injectedCss.indexOf(':where(.dark'))

    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await devpanel.locator('#devwind-search-input').fill('bg-slate-800')
    await devpanel.locator('.devwind-value__label', { hasText: 'bg-slate-800' }).first().click()

    injectedCss = await page.evaluate(() => document.getElementById('devwind-live-styles')?.textContent ?? '')
    // Avec .dark sur <html> : la règle de classe doit être émise en dernier.
    expect(injectedCss.lastIndexOf(':where(.dark')).toBeGreaterThan(injectedCss.lastIndexOf('@media (prefers-color-scheme'))
  })
})
