import { expect, test } from './fixtures/extension.js'

test.describe('Redimensionnement du rail de catégories', () => {
  test('le glisser-déposer redimensionne le rail, persiste, et le double-clic réinitialise', async ({ openFixture }) => {
    const { page, devpanel } = await openFixture('basic.html')
    await page.click('#target-btn')

    const rail = devpanel.locator('.devwind-category-nav__rail')
    const handle = devpanel.locator('.devwind-category-nav__resize-handle')

    const initialWidth = (await rail.boundingBox())!.width
    const box = (await handle.boundingBox())!

    await devpanel.mouse.move(box.x + 2, box.y + 20)
    await devpanel.mouse.down()
    await devpanel.mouse.move(box.x + 80, box.y + 20, { steps: 10 })
    await devpanel.mouse.up()

    const widenedWidth = (await rail.boundingBox())!.width
    expect(widenedWidth).toBeGreaterThan(initialWidth + 50)

    // Persisté en storage : reflété par une nouvelle sélection sans autre action.
    await page.click('#target-p')
    await expect(rail).toBeVisible()
    expect((await rail.boundingBox())!.width).toBe(widenedWidth)

    await handle.dblclick()
    expect((await rail.boundingBox())!.width).toBe(initialWidth)
  })
})
