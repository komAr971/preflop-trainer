import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { parseChart } from './core/chart'

it('the chart example in README.md is valid', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
  const json = readme.match(/```json\n([\s\S]*?)```/)![1]
  const res = parseChart(JSON.parse(json))
  expect(res.ok ? 'ok' : res.errors).toBe('ok')
})
