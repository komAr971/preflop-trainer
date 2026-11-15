import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  /** Button text, e.g. "3-bet". */
  label: string
  onSubmit: (sizeBb: number) => void
  onCancel: () => void
}

/** Asks for the raise size in bb; Enter confirms, Escape cancels. */
export function SizeEntry({ label, onSubmit, onCancel }: Props) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const value = Number(text.replace(',', '.'))
  const valid = text.trim() !== '' && Number.isFinite(value) && value > 0 && value <= 100

  return (
    <form
      className="size-entry"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSubmit(value)
      }}
    >
      <label>
        {t('size.prompt')}
        <input
          type="text"
          inputMode="decimal"
          autoFocus
          value={text}
          aria-label={t('size.prompt')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel()
          }}
        />
        <span>bb</span>
      </label>
      <button type="submit" className="primary" disabled={!valid}>
        {label} {valid ? `${value}bb` : ''}
      </button>
      <button type="button" onClick={onCancel}>
        {t('size.cancel')}
      </button>
    </form>
  )
}
