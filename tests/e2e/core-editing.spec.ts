import { expect, test } from './fixtures/extension.js'

test.describe('Parcours principal : sélection, édition, contraste, scan custom', () => {
  test('sélectionner un élément affiche ses classes et son contraste', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')

    await page.click('#target-btn')
    await expect(devpanel.locator('.devwind-panel__count')).toContainText('button')

    const chipTexts = await devpanel.locator('.devwind-chip__base').allTextContents()
    expect(chipTexts).toEqual(expect.arrayContaining(['bg-red-500', 'text-white', 'px-4', 'py-2', 'rounded', 'my-custom-btn']))

    // Texte blanc sur bg-red-500 (vraie valeur v4 : oklch(63.7% 0.237 25.331)) : ratio réel
    // ~3.81:1, sous le seuil AA (4.5:1) pour du texte normal — échoue donc volontairement ici.
    const contrastRow = devpanel.locator('.devwind-contrast-row')
    await expect(contrastRow).toContainText('3.81:1')
    await expect(contrastRow.locator('.devwind-contrast--fail')).toBeVisible()
  })

  test('appliquer une classe depuis la recherche met à jour le DOM réel', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')
    await page.click('#target-btn')

    const searchInput = devpanel.locator('#devwind-search-input')
    await searchInput.fill('bg-black')
    await devpanel.locator('.devwind-value__label', { hasText: 'bg-black' }).first().click()
    // Le panneau reste sur la vue "résultats de recherche" tant que le champ n'est pas vidé
    // (comportement normal, cf. DevPanel.tsx) — il faut le vider pour revoir les chips.
    await searchInput.fill('')

    await expect(devpanel.locator('.devwind-chip__base', { hasText: 'bg-black' })).toBeVisible()
    await expect(page.locator('#target-btn')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  })

  test('retirer une classe via son chip la retire du DOM réel', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')
    await page.click('#target-btn')

    await devpanel.getByRole('button', { name: 'Retirer my-custom-btn' }).click()

    await expect(devpanel.locator('.devwind-chip__base', { hasText: 'my-custom-btn' })).toHaveCount(0)
    const classes = await page.locator('#target-btn').getAttribute('class')
    expect(classes).not.toContain('my-custom-btn')
  })

  test('le scan CSS retrouve la classe custom de la page', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')
    await page.click('#target-btn')

    await devpanel.locator('.devwind-custom-section summary').first().click()
    await expect(devpanel.locator('.devwind-value-grid .devwind-value__label', { hasText: 'my-custom-btn' })).toBeVisible()
  })

  test("`after:` (vrai variant Tailwind) n'est pas détecté à tort comme préfixe de site", async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')
    await page.click('#target-btn')

    await devpanel.locator('.devwind-custom-section summary').first().click()
    await expect(devpanel.locator('.devwind-badge', { hasText: 'préfixe détecté' })).toHaveCount(0)
  })
})
