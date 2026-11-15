// Renders public/icon.svg to PNG icons with Playwright's Chromium.
// Usage: node scripts/make-icons.mjs
import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const svg = await readFile(new URL('../public/icon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch({ channel: 'chromium' })
for (const size of [192, 512, 180]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<style>body{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`)
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`
  await page.screenshot({ path: new URL(`../public/${name}`, import.meta.url).pathname })
  await page.close()
}
await browser.close()
