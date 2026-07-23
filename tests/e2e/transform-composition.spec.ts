import { expect, test } from './fixtures/extension.js'

test.describe("Composition transform v3 (scale + rotate via une seule propriété)", () => {
  test('scale-105 puis rotate-45 se composent tous les deux sur `transform`, sans s’écraser', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')
    await page.click('#target-btn')

    const searchInput = devpanel.locator('#devwind-search-input')

    await searchInput.fill('scale-105')
    await devpanel.locator('.devwind-value__label', { hasText: 'scale-105' }).first().click()
    await searchInput.fill('rotate-45')
    await devpanel.locator('.devwind-value__label', { hasText: 'rotate-45' }).first().click()
    await searchInput.fill('')

    // v3 (contrairement à v4) : scale/rotate n'ont PAS de propriété CSS native séparée, les
    // deux classes composent sur la même propriété `transform` via des variables --tw-* + une
    // formule partagée — chacune pose SA variable sans écraser celle de l'autre.
    const computed = await page.$eval('#target-btn', (el) => {
      const style = getComputedStyle(el)
      return {
        scaleX: style.getPropertyValue('--tw-scale-x').trim(),
        rotate: style.getPropertyValue('--tw-rotate').trim(),
        transform: style.transform,
      }
    })
    expect(computed.scaleX).toBe('1.05')
    expect(computed.rotate).toBe('45deg')
    expect(computed.transform).not.toBe('none')

    const injectedCss = await page.evaluate(() => document.getElementById('devwind-live-styles')?.textContent ?? '')
    expect(injectedCss).toMatch(/--tw-scale-x: 1\.05/)
    expect(injectedCss).toMatch(/--tw-rotate: 45deg/)
    // Les deux règles réaffirment la MÊME formule composite sur `transform` (pas juste leur
    // propre fonction isolée) : preuve que n'importe quelle combinaison de classes fonctionne
    // par cascade, pas seulement la dernière appliquée.
    const transformDeclCount = (injectedCss.match(/transform: translate\(var\(--tw-translate-x/g) ?? []).length
    expect(transformDeclCount).toBe(2)
  })
})
