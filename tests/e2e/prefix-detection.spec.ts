import { expect, test } from './fixtures/extension.js'

test.describe('Détection de préfixe de site (syntaxe v3, tiret collé)', () => {
  test('détecte "tw-" sur un site qui préfixe ses classes', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('prefix-v3.html')
    await page.click('#target-btn')

    await devpanel.locator('.devwind-custom-section summary').first().click()
    await expect(devpanel.locator('.devwind-badge', { hasText: 'préfixe détecté : tw-' })).toBeVisible()
  })
})
