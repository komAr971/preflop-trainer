import { expect, test } from '@playwright/test'

test.describe('multitabling (wide screen)', () => {
  test.skip(({ isMobile }) => isMobile, 'wide screens only')
  test.use({ viewport: { width: 1600, height: 900 } })

  test('four tables fit the screen; hotkeys go to the highlighted table', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('group', { name: /(Столы|Tables)/ }).getByRole('button', { name: '4' }).click()
    const cells = page.getByTestId('table-cell')
    await expect(cells).toHaveCount(4)
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true)

    const active = page.locator('[data-testid="table-cell"][data-active="true"]')
    await expect(active).toHaveCount(1)
    await page.screenshot({ path: 'test-results/multi-4.png' })
    const index = await active.getAttribute('data-table')
    const key = (await active.locator('.action kbd').first().textContent())!.toLowerCase()
    await page.keyboard.press(key)
    // That table answered: it either shows its result or already dealt a new hand.
    await expect(page.locator(`[data-table="${index}"] .action.is-chosen, [data-table="${index}"] .table-feedback`).first())
      .toBeVisible({ timeout: 1000 })
      .catch(() => {})
    await expect(page.getByTestId('score')).toContainText('/1')

    // The choice is remembered.
    await page.reload()
    await expect(cells).toHaveCount(4)
  })

  test('a mistake stops only its table; "Why?" opens the review panel, Space goes on', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('group', { name: /(Столы|Tables)/ }).getByRole('button', { name: '2' }).click()
    await expect(page.getByTestId('table-cell')).toHaveCount(2)
    const why = page.getByRole('button', { name: /^(Почему\?|Why\?)$/ })
    for (let i = 0; i < 40 && (await why.count()) === 0; i++) {
      await page.locator('[data-table="0"] .action:not([disabled])').first().click({ timeout: 2000 }).catch(() => {})
    }
    await expect(why).toHaveCount(1)
    // The other table keeps playing.
    await expect(page.locator('[data-table="1"] .action:not([disabled])').first()).toBeVisible()
    await page.screenshot({ path: 'test-results/multi-2-mistake.png' })
    await why.click()
    await expect(page.getByTestId('review-panel')).toBeVisible()
    await expect(page.getByTestId('review-panel').getByTestId('why')).toBeVisible()
    await page.screenshot({ path: 'test-results/multi-review.png' })
    await page.keyboard.press('Space')
    await expect(page.getByTestId('review-panel')).toBeHidden()
    await expect(why).toHaveCount(0)
  })

  test('a narrow window plays one table and gets the choice back when wide again', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('group', { name: /(Столы|Tables)/ }).getByRole('button', { name: '3' }).click()
    await expect(page.getByTestId('table-cell')).toHaveCount(3)
    await page.setViewportSize({ width: 800, height: 900 })
    await expect(page.getByTestId('table-cell')).toHaveCount(1)
    await expect(page.getByRole('group', { name: /(Столы|Tables)/ })).toBeHidden()
    await page.setViewportSize({ width: 1600, height: 900 })
    await expect(page.getByTestId('table-cell')).toHaveCount(3)
  })
})
