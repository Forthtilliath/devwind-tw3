import { expect, test } from './fixtures/extension.js'

test.describe('Bascule de langue des libellés de catégorie', () => {
  test('FR par défaut, EN cohérent après bascule, persisté à la réouverture', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')
    await page.click('#target-btn')

    const langBtn = devpanel.locator('.devwind-lang-btn')
    await expect(langBtn).toHaveText('FR')
    await expect(devpanel.locator('.devwind-category-nav__tab').first()).toHaveText('Espacement')

    await langBtn.click()
    await expect(langBtn).toHaveText('EN')
    await expect(devpanel.locator('.devwind-category-nav__tab').first()).toHaveText('Spacing')

    // Pas de mélange dans une sous-catégorie connue pour avoir été incohérente (Largeur/Width).
    await devpanel.locator('.devwind-category-nav__tab', { hasText: 'Borders & Radius' }).click()
    const rowLabels = await devpanel.locator('.devwind-row__label').allTextContents()
    expect(rowLabels).toContain('Width')
    expect(rowLabels).not.toContain('Largeur')
  })
})
