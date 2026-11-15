import { useEffect, useState } from 'react'

interface Props {
  value: number
  min: number
  max: number
  step?: number
  integer?: boolean
  ariaLabel?: string
  onChange: (v: number) => void
}

/**
 * Number input that lets the user clear and retype freely:
 * keeps the raw text locally and commits only valid values; resets to the last valid value on blur.
 */
export function NumberField({ value, min, max, step, integer, ariaLabel, onChange }: Props) {
  const [text, setText] = useState(String(value))

  useEffect(() => setText(String(value)), [value])

  return (
    <input
      type="number"
      inputMode={integer ? 'numeric' : 'decimal'}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        const v = Number(e.target.value)
        if (e.target.value !== '' && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v))) {
          onChange(v)
        }
      }}
      onFocus={(e) => {
        const el = e.currentTarget
        requestAnimationFrame(() => el.select())
      }}
      onBlur={() => setText(String(value))}
    />
  )
}
