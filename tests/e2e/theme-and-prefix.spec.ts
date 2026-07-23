import { expect, test } from './fixtures/extension.js'

test.describe('Site avec préfixe custom + variables de thème', () => {
  test('détecte le préfixe, liste les variables de thème préfixées et synthétise avec le bon nom de variable', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('themed-prefixed.html')
    await page.click('#target-btn')

    await devpanel.locator('.devwind-custom-section summary').first().click()
    await expect(devpanel.locator('.devwind-badge', { hasText: 'préfixe détecté : tw:' })).toBeVisible()

    const themeSection = devpanel.locator('.devwind-custom-section', { hasText: 'Thème détecté sur ce site' })
    await themeSection.locator('summary').click()
    const varNames = await themeSection.locator('.devwind-theme-vars__name').allTextContents()
    expect(varNames).toEqual(
      expect.arrayContaining(['--tw-color-red-500', '--tw-color-emerald-500', '--tw-color-blue-600', '--tw-radius-lg', '--tw-spacing']),
    )
    expect(varNames).not.toContain('--unrelated-custom-var')

    // bg-emerald-500 n'a aucune règle réelle sur cette fixture : doit être synthétisée en
    // référençant var(--tw-color-emerald-500, ...) puisque le site a un préfixe "tw" détecté.
    await devpanel.locator('#devwind-search-input').fill('bg-emerald-500')
    await devpanel.locator('.devwind-value__label', { hasText: 'bg-emerald-500' }).first().click()

    const injectedCss = await page.evaluate(() => document.getElementById('devwind-live-styles')?.textContent ?? '')
    expect(injectedCss).toContain('--tw-color-emerald-500')
  })

  test("l'ordre des règles dark: suit la stratégie réellement active sur la page", async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('themed-prefixed.html')
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
