import { expect, test } from './fixtures/extension.js'

test.describe("Historique des modifications de la session", () => {
  test('regroupe les changements faits sur plusieurs éléments et se vide sur demande', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')

    // Modification sur un premier élément.
    await page.click('#target-btn')
    const searchInput = devpanel.locator('#devwind-search-input')
    await searchInput.fill('bg-black')
    await devpanel.locator('.devwind-value__label', { hasText: 'bg-black' }).first().click()
    await searchInput.fill('')

    // Modification sur un second élément, différent.
    await page.click('#target-p')
    await searchInput.fill('text-red-500')
    await devpanel.locator('.devwind-value__label', { hasText: 'text-red-500' }).first().click()
    await searchInput.fill('')

    const changelogBtn = devpanel.locator('.devwind-changelog-btn')
    await expect(changelogBtn.locator('.devwind-changelog-btn__count')).toHaveText('2')
    await changelogBtn.click()

    const entries = devpanel.locator('.devwind-changelog__entry')
    await expect(entries).toHaveCount(2)

    const entryTexts = await entries.allTextContents()
    expect(entryTexts.some((t) => t.includes('button#target-btn') && t.includes('+bg-black') && t.includes('−bg-red-500'))).toBe(true)
    expect(entryTexts.some((t) => t.includes('p#target-p') && t.includes('+text-red-500'))).toBe(true)

    await devpanel.locator('.devwind-changelog__actions button', { hasText: 'Vider' }).click()
    await expect(devpanel.locator('.devwind-changelog__entry')).toHaveCount(0)
    await expect(devpanel.locator('.devwind-changelog-btn__count')).toHaveCount(0)
  })
})
