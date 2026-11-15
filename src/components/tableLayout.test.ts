import { describe, expect, it } from 'vitest'
import { CARD_H, CARD_W } from './cardSize'
import { LANDSCAPE, PORTRAIT, heroCardsY, type Layout } from './tableLayout'

type Box = { x1: number; y1: number; x2: number; y2: number; name: string }

const overlap = (a: Box, b: Box) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2

function boxes(l: Layout): Box[] {
  const [w, h] = l.seatSize
  const out: Box[] = []
  l.slots.forEach((s, i) => {
    out.push({ name: `seat${i}`, x1: s.seat[0] - w / 2, y1: s.seat[1] - h / 2, x2: s.seat[0] + w / 2, y2: s.seat[1] + h / 2 })
    // chip + amount text to the right
    out.push({ name: `bet${i}`, x1: s.bet[0] - 11, y1: s.bet[1] - 11, x2: s.bet[0] + 50, y2: s.bet[1] + 11 })
    out.push({ name: `dealer${i}`, x1: s.dealer[0] - 13, y1: s.dealer[1] - 13, x2: s.dealer[0] + 13, y2: s.dealer[1] + 13 })
  })
  const cw = CARD_W * l.cardScale
  const y = heroCardsY(l)
  out.push({ name: 'cards', x1: l.center[0] - cw - 4, y1: y, x2: l.center[0] + cw + 4, y2: y + CARD_H * l.cardScale })
  return out
}

describe.each([LANDSCAPE, PORTRAIT])('table layout $name', (layout) => {
  const all = boxes(layout)

  it('keeps everything inside the view box', () => {
    for (const b of all) {
      expect(b.x1, b.name).toBeGreaterThanOrEqual(0)
      expect(b.y1, b.name).toBeGreaterThanOrEqual(0)
      expect(b.x2, b.name).toBeLessThanOrEqual(layout.width)
      expect(b.y2, b.name).toBeLessThanOrEqual(layout.height)
    }
  })

  it('has no overlapping seats, bets, cards (dealer button sits next to its own seat)', () => {
    for (const a of all) {
      for (const b of all) {
        if (a === b || a.name.startsWith('dealer') || b.name.startsWith('dealer')) continue
        expect(overlap(a, b), `${a.name} × ${b.name}`).toBe(false)
      }
    }
  })

  it('dealer buttons do not cover seats or cards', () => {
    const solid = all.filter((b) => b.name.startsWith('seat') || b.name === 'cards')
    for (const d of all.filter((b) => b.name.startsWith('dealer'))) {
      for (const s of solid) expect(overlap(d, s), `${d.name} × ${s.name}`).toBe(false)
    }
  })
})
