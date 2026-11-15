import { expect, test, type Page } from '@playwright/test'

const status = (page: Page) => page.getByRole('status')
const answer = (page: Page, name: RegExp) => page.getByRole('button', { name }).click()
const FOLD = /^(Фолд|Fold)/
const NEXT = /^(Дальше|Next)/

/** Strategy line "… for AKo: …" → hand + spot text identify the question. */
async function questionId(page: Page) {
  const spot = (await page.getByTestId('spot-text').innerText()).replace(/(Повтор ошибки|Mistake review)$/, '')
  return spot + '|' + (await page.locator('[data-card]').evaluateAll((els) => els.map((e) => e.getAttribute('data-card')![0]).join('')))
}

test('a mistake comes back as the 3rd question with a review badge', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one browser is enough')
  await page.goto(process.env.E2E_URL ?? '/')

  // Make a mistake: keep folding until a fold is wrong.
  let missed = ''
  for (let i = 0; i < 60 && !missed; i++) {
    const id = await questionId(page)
    await answer(page, FOLD)
    await expect(status(page)).toBeVisible()
    if ((await status(page).getAttribute('class'))!.includes('bad')) missed = id
    if (missed) await answer(page, NEXT)
    else await expect(status(page)).toBeHidden() // auto-next after a correct answer
  }
  expect(missed).not.toBe('')

  // Two more questions, then the missed hand must return.
  for (let i = 0; i < 2; i++) {
    await expect(page.locator('.badge-review')).toHaveCount(0)
    await answer(page, FOLD)
    await expect(status(page)).toBeVisible()
    if ((await status(page).getAttribute('class'))!.includes('bad')) await answer(page, NEXT)
    await expect(status(page)).toBeHidden()
  }
  await expect(page.locator('.badge-review')).toBeVisible()
  expect(await questionId(page)).toBe(missed)
})
