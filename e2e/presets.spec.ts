import { expect, test } from '@playwright/test'

test('×3 sets the raise to three times the bet in front', async ({ page }, info) => {
  await page.goto('/')
  // Skip hands where raising is an all-in (no sizer).
  for (let i = 0; i < 20 && (await page.getByRole('slider').isDisabled()); i++) {
    await page.locator('.action-bar .action').first().click()
    await page.keyboard.press('Space')
  }
  const x3 = page.getByRole('group', { name: /(Быстрый размер|Quick raise)/ }).getByRole('button', { name: 'x3' })
  const expected = (await x3.getAttribute('title'))!.replace('bb', '')
  await x3.click()
  await expect(page.getByRole('textbox', { name: /(Размер рейза|Raise size)/ })).toHaveValue(expected)
  await expect(x3).toHaveAttribute('aria-pressed', 'true')
  await page.screenshot({ path: `test-results/presets-${info.project.name}.png` })
})
