import { expect, test, type Page } from '@playwright/test'

/** The table takes the free height: an empty-looking screen (0 px table) must fail. */
async function expectBigTable(page: Page) {
  const h = (await page.locator('svg.table').boundingBox())!.height
  expect(h).toBeGreaterThan(page.viewportSize()!.height * 0.4)
}

test.describe('phone layout', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone only')

  test('table, bet sizer and actions fit one screen without scrolling', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-card]')).toHaveCount(2)
    for (const loc of [page.locator('svg.table'), page.locator('.action-bar'), page.locator('.action').last()]) {
      await expect(loc).toBeInViewport({ ratio: 1 })
    }
    await expect(page.locator('.bet-sizer')).toBeInViewport({ ratio: 1 })
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true)
    await expectBigTable(page)
    await page.screenshot({ path: 'test-results/phone-train.png' })
  })

  test('burger menu opens navigation and closes after navigating', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /^(Чарты|Charts)$/ })).toBeHidden()
    await page.getByRole('button', { name: /^(Меню|Menu)$/ }).click()
    await page.screenshot({ path: 'test-results/phone-menu.png' })
    await page.getByRole('link', { name: /^(Чарты|Charts)$/ }).click()
    await expect(page).toHaveURL(/#\/charts$/)
    await expect(page.getByRole('link', { name: /^(Чарты|Charts)$/ })).toBeHidden()
  })

  test('size input selects its value on focus', async ({ page }) => {
    await page.goto('/')
    for (let i = 0; i < 20 && (await page.getByRole('slider').isDisabled()); i++) {
      await page.locator('.action-bar .action').first().click()
      await page.keyboard.press('Space')
    }
    const input = page.getByRole('textbox', { name: /(Размер рейза|Raise size)/ })
    await input.tap()
    await expect.poll(() => input.evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!)).toBe(
      (await input.inputValue()).length,
    )
  })
})

test.describe('small phone (375×667)', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone only')
  test.use({ viewport: { width: 375, height: 667 } })

  test('still fits one screen', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-card]')).toHaveCount(2)
    await expect(page.locator('.action').last()).toBeInViewport({ ratio: 1 })
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true)
    await expectBigTable(page)
    await page.screenshot({ path: 'test-results/phone-small.png' })
  })

  test('the mistake modal fits without scrolling', async ({ page }) => {
    await page.goto('/')
    for (let i = 0; i < 30 && (await page.getByTestId('why').count()) === 0; i++) {
      await page.keyboard.press('Space')
      await page.locator('.action-bar .action').first().click()
    }
    const modal = page.getByRole('dialog')
    await expect(modal).toBeInViewport({ ratio: 1 })
    expect(await modal.locator('.feedback').evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: 'test-results/phone-small-mistake.png' })
  })
})
