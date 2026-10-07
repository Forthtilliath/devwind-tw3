import { expect, test } from './fixtures/extension.js'

test.describe('Accessibilité du panneau', () => {
  test('la poignée du rail se redimensionne au clavier sans déclencher la navigation entre éléments', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')
    await page.click('#target-btn')

    const rail = devpanel.locator('.devwind-category-nav__rail')
    const handle = devpanel.getByRole('separator', { name: 'Redimensionner la colonne des catégories' })
    const initialWidth = Number(await handle.getAttribute('aria-valuenow'))

    await handle.focus()
    await handle.press('ArrowRight')
    await expect(handle).toHaveAttribute('aria-valuenow', String(initialWidth + 8))
    // ←/→ consommées par la poignée : la sélection reste sur le bouton (pas de saut au frère).
    await expect(devpanel.locator('.devwind-panel__count')).toContainText('button')

    await handle.press('End')
    await expect(handle).toHaveAttribute('aria-valuenow', '220')
    expect((await rail.boundingBox())!.width).toBe(220)

    await handle.press('Enter')
    await expect(handle).toHaveAttribute('aria-valuenow', String(initialWidth))
  })

  test('le popover expose son état et rend le focus au déclencheur à la fermeture', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')
    await page.click('#target-btn')

    const trigger = devpanel.getByRole('button', { name: 'Copier les classes' })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')

    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const dialog = devpanel.getByRole('dialog', { name: 'Copier les classes' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Classes', exact: true })).toBeFocused()

    await devpanel.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })

  test('les boutons emoji ont un nom accessible et le verrou expose son état', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')
    await page.click('#target-btn')

    await expect(devpanel.getByRole('button', { name: /^Thème : / })).toBeVisible()
    await expect(devpanel.getByRole('button', { name: /^Historique de la session/ })).toBeVisible()
    const lock = devpanel.getByRole('button', { name: 'Verrouiller la sélection' })
    await expect(lock).toHaveAttribute('aria-pressed', 'false')
    await lock.click()
    await expect(lock).toHaveAttribute('aria-pressed', 'true')
  })

  test('le contraste compose un texte translucide sur le fond réel', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')
    await page.click('#translucent-text')

    // Blanc à 50 % sur noir ≈ rgb(128,128,128) → ~5.32:1 (et non 21:1 sans composition).
    const badge = devpanel.locator('.devwind-contrast-row .devwind-contrast')
    await expect(badge).toContainText(/^5\.3\d:1/)
  })

  test('un fond en dégradé marque le ratio comme approximatif', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')
    await page.click('#gradient-text')

    const badge = devpanel.locator('.devwind-contrast-row .devwind-contrast')
    await expect(badge).toContainText(/^≈/)
    await expect(badge).toHaveAttribute('title', /approximatif/)
  })
})
