import { expect, test } from './fixtures/extension.js'
import type { Page } from '@playwright/test'

/** Applique une classe via la recherche globale, puis revient à la vue normale. */
async function applyFromSearch(devpanel: Page, className: string) {
  const searchInput = devpanel.locator('#devwind-search-input')
  await searchInput.fill(className)
  await devpanel.locator('.devwind-value__label', { hasText: className }).first().click()
  await searchInput.fill('')
}

test.describe('Annuler / rétablir', () => {
  test('Ctrl+Z annule la dernière modification, Ctrl+Maj+Z la rétablit', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')
    const btn = page.locator('#target-btn')
    await page.click('#target-btn')
    await applyFromSearch(devpanel, 'bg-black')
    await expect(btn).toHaveClass(/bg-black/)

    // Hors d'un champ texte (qui garde son propre Ctrl+Z).
    await devpanel.locator('.devwind-panel__title').click()
    await devpanel.keyboard.press('Control+z')
    await expect(btn).toHaveClass(/bg-red-500/)
    await expect(btn).not.toHaveClass(/bg-black/)
    await expect(devpanel.locator('.devwind-chip__base', { hasText: 'bg-red-500' })).toBeVisible()

    await devpanel.keyboard.press('Control+Shift+z')
    await expect(btn).toHaveClass(/bg-black/)
  })

  test("le bouton d'une entrée d'historique l'annule ; un conflit est refusé avec un message", async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')
    const btn = page.locator('#target-btn')
    await page.click('#target-btn')
    await applyFromSearch(devpanel, 'bg-black')
    await applyFromSearch(devpanel, 'bg-white')

    await devpanel.locator('.devwind-changelog-btn').click()
    // Entrée la plus ancienne (bg-red-500 → bg-black) : bg-black a été remplacé depuis.
    await devpanel.locator('.devwind-changelog__entry').last().getByRole('button', { name: /^Annuler/ }).click()
    await expect(devpanel.locator('.devwind-notice')).toContainText('modifiées depuis')
    await expect(btn).toHaveClass(/bg-white/)

    await devpanel.locator('.devwind-changelog__entry').first().getByRole('button', { name: /^Annuler/ }).click()
    await expect(btn).toHaveClass(/bg-black/)
    await expect(devpanel.locator('.devwind-changelog__entry--undone')).toHaveCount(1)
  })
})

test('aperçu au survol dans le popover, sans toucher à l’historique', async ({ openFixture }) => {
  const { page, devpanel } = await openFixture('basic.html')
  const btn = page.locator('#target-btn')
  await page.click('#target-btn')

  await devpanel.locator('.devwind-category-nav__tab', { hasText: 'Couleurs' }).click()
  await devpanel.getByRole('button', { name: /^Fond :/ }).click()
  await devpanel.locator('.devwind-vpl__row', { hasText: /^black/ }).first().hover()
  await expect(btn).toHaveClass(/bg-black/)
  await expect(btn).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  await expect(devpanel.locator('.devwind-changelog-btn__count')).toHaveCount(0)

  // Souris hors de la liste : retour à l'état réel.
  await devpanel.locator('.devwind-panel__title').hover()
  await expect(btn).toHaveClass(/bg-red-500/)
  await expect(btn).not.toHaveClass(/bg-black/)
})

test('export des classes finales de tous les éléments modifiés, avec sélecteurs uniques', async ({ openFixture }) => {
  const { page, devpanel } = await openFixture('basic.html')
  await devpanel.evaluate(() => {
    const copied: string[] = []
    ;(window as unknown as { __copied: string[] }).__copied = copied
    navigator.clipboard.writeText = async (text: string) => {
      copied.push(text)
    }
  })

  await page.click('#target-btn')
  await applyFromSearch(devpanel, 'bg-black')
  await page.click('#target-p')
  await applyFromSearch(devpanel, 'text-red-500')

  await devpanel.locator('.devwind-changelog-btn').click()
  await devpanel.getByRole('button', { name: 'Classes finales' }).click()
  await expect.poll(() => devpanel.evaluate(() => (window as unknown as { __copied: string[] }).__copied.at(-1) ?? '')).toContain(
    'button#target-btn: ',
  )
  const text = await devpanel.evaluate(() => (window as unknown as { __copied: string[] }).__copied.at(-1) ?? '')
  expect(text).toContain('bg-black')
  expect(text).toContain('p#target-p: text-left text-red-500')
})

test('les breakpoints de la toolbar suivent les media queries du site', async ({ openFixture }) => {
  const { page, devpanel } = await openFixture('basic.html')
  await page.click('#target-btn')
  await expect(devpanel.locator('.devwind-variant-pill', { hasText: /^sm$/ })).toHaveAttribute('title', 'À partir de 480px')
})

test('après rechargement de la page, « Reconnecter » rétablit le panneau', async ({ openFixture }) => {
  const { page, devpanel } = await openFixture('basic.html')
  await page.click('#target-btn')
  await page.reload()

  const reconnect = devpanel.getByRole('button', { name: 'Reconnecter' })
  await expect(reconnect).toBeVisible()
  await reconnect.click()
  await expect(devpanel.locator('.devwind-hint')).toBeVisible()

  await page.click('#target-btn')
  await expect(devpanel.locator('.devwind-panel__count')).toContainText('button')
})
