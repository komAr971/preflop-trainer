/** Synthesized UI sounds (Web Audio): no files, works offline. */
export type SoundKind = 'deal' | 'chip' | 'correct' | 'wrong'

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(ac: AudioContext, out: AudioNode, freq: number, start: number, dur: number, type: OscillatorType) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(1, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(gain).connect(out)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

function noise(ac: AudioContext, out: AudioNode, start: number, dur: number) {
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = ac.createBufferSource()
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 3000
  src.buffer = buffer
  src.connect(filter).connect(out)
  src.start(start)
}

export function playSound(kind: SoundKind, volume: number): void {
  if (volume <= 0) return
  const ac = audio()
  if (!ac) return
  const out = ac.createGain()
  out.gain.value = volume * 0.25
  out.connect(ac.destination)
  const t = ac.currentTime
  switch (kind) {
    case 'deal':
      noise(ac, out, t, 0.07)
      noise(ac, out, t + 0.09, 0.07)
      break
    case 'chip':
      tone(ac, out, 2600, t, 0.05, 'triangle')
      tone(ac, out, 3300, t + 0.045, 0.06, 'triangle')
      break
    case 'correct':
      tone(ac, out, 660, t, 0.12, 'sine')
      tone(ac, out, 990, t + 0.1, 0.18, 'sine')
      break
    case 'wrong':
      tone(ac, out, 300, t, 0.14, 'sawtooth')
      tone(ac, out, 210, t + 0.12, 0.22, 'sawtooth')
      break
  }
}
