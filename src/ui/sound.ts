/** Synthesized UI sounds (Web Audio): no files, works offline. Kept soft: no high pitches, smooth envelopes. */
export type SoundKind = 'deal' | 'chip' | 'correct' | 'wrong'

export const SOUND_KINDS: SoundKind[] = ['deal', 'chip', 'correct', 'wrong']

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Soft attack, exponential-like release; no clicks. */
function envelope(gain: GainNode, start: number, peak: number, attack: number, release: number) {
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + attack)
  gain.gain.setTargetAtTime(0, start + attack, release / 4)
}

function tone(ac: BaseAudioContext, out: AudioNode, freq: number, start: number, opts: { peak: number; release: number; type?: OscillatorType; glideTo?: number }) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(freq, start)
  if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, start + opts.release)
  envelope(gain, start, opts.peak, 0.008, opts.release)
  osc.connect(gain).connect(out)
  osc.start(start)
  osc.stop(start + opts.release + 0.1)
}

/** Card sliding on felt: low-passed noise with a falling cutoff. */
function swish(ac: BaseAudioContext, out: AudioNode, start: number) {
  const dur = 0.12
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  src.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(1400, start)
  filter.frequency.exponentialRampToValueAtTime(400, start + dur)
  const gain = ac.createGain()
  envelope(gain, start, 0.5, 0.015, 0.09)
  src.connect(filter).connect(gain).connect(out)
  src.start(start)
}

/** Schedules a sound into any audio graph (used live and for offline analysis). */
/** Chip clack: a very short noise burst through a resonant band — percussive, not a beep. */
function clack(ac: BaseAudioContext, out: AudioNode, start: number, center: number, peak: number) {
  const dur = 0.05
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  src.buffer = buffer
  const band = ac.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = center
  band.Q.value = 2.5
  const gain = ac.createGain()
  envelope(gain, start, peak, 0.002, 0.03)
  src.connect(band).connect(gain).connect(out)
  src.start(start)
}

export function renderSound(ac: BaseAudioContext, destination: AudioNode, kind: SoundKind, volume: number, t: number): void {
  // Master chain: gentle low-pass removes any harsh edge.
  const master = ac.createGain()
  master.gain.value = volume * 0.3
  const soften = ac.createBiquadFilter()
  soften.type = 'lowpass'
  soften.frequency.value = 2200
  master.connect(soften).connect(destination)
  switch (kind) {
    case 'deal':
      swish(ac, master, t)
      swish(ac, master, t + 0.12)
      break
    case 'chip':
      clack(ac, master, t, 900, 1.4)
      clack(ac, master, t + 0.055, 1100, 1.1)
      clack(ac, master, t + 0.1, 800, 0.8)
      break
    case 'correct':
      tone(ac, master, 587, t, { peak: 0.45, release: 0.25 })
      tone(ac, master, 880, t + 0.09, { peak: 0.4, release: 0.35 })
      break
    case 'wrong':
      tone(ac, master, 233, t, { peak: 0.5, release: 0.35, type: 'triangle', glideTo: 185 })
      break
  }
}

export function playSound(kind: SoundKind, volume: number): void {
  if (volume <= 0) return
  const ac = audio()
  if (!ac) return
  renderSound(ac, ac.destination, kind, volume, ac.currentTime + 0.01)
}
