import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fmtBb } from '../core/format'

interface Props {
  min: number
  max: number
  value: number
  onChange: (v: number) => void
  /** Enter in the input confirms the raise. */
  onSubmit: () => void
  disabled?: boolean
}

const STEP = 0.5
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const snap = (v: number) => Math.round(v / STEP) * STEP

/** Poker-client style bet sizer: −, slider, +, and a bb input. */
export function BetSizer({ min, max, value, onChange, onSubmit, disabled }: Props) {
  const { t } = useTranslation()
  const [text, setText] = useState(fmtBb(value))
  useEffect(() => setText(fmtBb(value)), [value])

  const set = (v: number) => onChange(clamp(snap(v), min, max))

  return (
    <div className="bet-sizer" aria-label={t('size.prompt')}>
      <button type="button" aria-label="−" disabled={disabled || value <= min} onClick={() => set(value - STEP)}>
        −
      </button>
      <input
        type="range"
        min={min}
        max={max}
        step={STEP}
        value={value}
        disabled={disabled}
        aria-label={t('size.slider')}
        onChange={(e) => set(Number(e.target.value))}
      />
      <button type="button" aria-label="+" disabled={disabled || value >= max} onClick={() => set(value + STEP)}>
        +
      </button>
      <label className="bet-input">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          disabled={disabled}
          aria-label={t('size.prompt')}
          onChange={(e) => {
            setText(e.target.value)
            const v = Number(e.target.value.replace(',', '.'))
            if (e.target.value.trim() !== '' && Number.isFinite(v) && v >= min && v <= max) onChange(v)
          }}
          // Select the current value so a new size can be typed over it (also on mobile).
          onFocus={(e) => {
            const el = e.currentTarget
            requestAnimationFrame(() => el.select())
          }}
          onBlur={() => setText(fmtBb(value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSubmit()
            }
          }}
        />
        bb
      </label>
    </div>
  )
}
