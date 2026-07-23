import { expect, test } from './fixtures/extension.js'

test.describe('Échap sur la page verrouille la sélection', () => {
  test('presser Échap pendant le picking verrouille et met à jour l’icône du panneau', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')

    const lockBtn = devpanel.locator('.devwind-lock-btn')
    await expect(lockBtn).not.toHaveClass(/devwind-lock-btn--active/)

    await page.click('#target-btn')
    await expect(devpanel.locator('.devwind-panel__count')).toContainText('button')

    await page.keyboard.press('Escape')

    await expect(lockBtn).toHaveClass(/devwind-lock-btn--active/)
    await expect(lockBtn).toHaveText('🔒')

    // La sélection courante doit être préservée par le verrouillage (pas perdue).
    await expect(devpanel.locator('.devwind-panel__count')).toContainText('button')
  })
})
