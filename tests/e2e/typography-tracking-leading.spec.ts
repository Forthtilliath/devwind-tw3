import { expect, test } from './fixtures/extension.js'

test.describe('Tracking / Leading (letter-spacing / line-height autonome)', () => {
  test('tracking-wide et leading-6 sont applicables et synthétisés', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')
    await page.click('#target-btn')

    const searchInput = devpanel.locator('#devwind-search-input')

    await searchInput.fill('tracking-wide')
    await devpanel.locator('.devwind-value__label', { hasText: 'tracking-wide' }).first().click()
    await searchInput.fill('leading-6')
    await devpanel.locator('.devwind-value__label', { hasText: 'leading-6' }).first().click()
    await searchInput.fill('')

    await expect(devpanel.locator('.devwind-chip__base', { hasText: 'tracking-wide' })).toBeVisible()
    await expect(devpanel.locator('.devwind-chip__base', { hasText: 'leading-6' })).toBeVisible()

    const computed = await page.$eval('#target-btn', (el) => {
      const style = getComputedStyle(el)
      return { letterSpacing: parseFloat(style.letterSpacing), fontSize: parseFloat(style.fontSize), lineHeight: style.lineHeight }
    })
    // tracking-wide = 0.025em, relatif à la taille de police RÉELLE du bouton (pas forcément 16px
    // sur un <button> non stylé, la feuille UA du navigateur applique sa propre taille par défaut).
    expect(computed.letterSpacing).toBeCloseTo(computed.fontSize * 0.025, 2)
    // leading-6 = 1.5rem, relatif à la taille de police RACINE (16px par défaut), pas à celle du
    // bouton — reste fixe indépendamment de la police du bouton.
    expect(computed.lineHeight).toBe('24px')
  })
})
