import type { Action, Spot } from '../core/chart'
import type { ActionOption } from '../core/scenario'
import { HOTKEYS, needsSize, useActionLabel } from './actionLabels'

interface Props {
  spot: Spot
  options: ActionOption[]
  disabled: boolean
  chosen?: Action
  accepted?: Action[]
  onAction: (action: Action) => void
  /** Raise asks for a size instead of answering immediately. */
  sizeInput: boolean
  onAskSize: () => void
}

export function ActionBar({ spot, options, disabled, chosen, accepted, onAction, sizeInput, onAskSize }: Props) {
  const label = useActionLabel()
  return (
    <div className="action-bar">
      {options.map((o) => {
        const state = !accepted
          ? ''
          : accepted.includes(o.action)
            ? 'is-correct'
            : o.action === chosen
              ? 'is-wrong'
              : 'is-dim'
        return (
          <button
            key={o.action}
            type="button"
            className={`action action-${o.action} ${state}`}
            disabled={disabled}
            onClick={() => (needsSize(o, sizeInput) ? onAskSize() : onAction(o.action))}
          >
            {label(spot, o, needsSize(o, sizeInput))}
            <kbd>{HOTKEYS[o.action].toUpperCase()}</kbd>
          </button>
        )
      })}
    </div>
  )
}
