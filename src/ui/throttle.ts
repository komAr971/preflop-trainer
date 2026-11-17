/** Returns `allow(key, now)`: true at most once per `gapMs` for each key. */
export function createThrottle(gapMs: number): (key: string, now: number) => boolean {
  const last = new Map<string, number>()
  return (key, now) => {
    const prev = last.get(key)
    if (prev !== undefined && now - prev < gapMs) return false
    last.set(key, now)
    return true
  }
}
