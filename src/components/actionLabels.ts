import { useTranslation } from 'react-i18next'
import { bbChecks, type Action, type Spot } from '../core/chart'
import { fmtBb } from '../core/format'
import type { ActionOption } from '../core/scenario'

export const HOTKEYS: Record<Action, string> = { fold: 'f', call: 'c', raise: 'r' }

export function useActionLabel() {
  const { t } = useTranslation()
  /** `askSize`: the raise amount is hidden because the user has to enter it. */
  return (spot: Spot, option: ActionOption, askSize = false): string => {
    const amount = option.toBb !== undefined ? fmtBb(option.toBb) : ''
    if (askSize && option.action === 'raise') return t(`actionAsk.${spot.kind}`)
    switch (option.action) {
      case 'fold':
        return t('action.fold')
      case 'call':
        if (bbChecks(spot)) return t('action.check')
        if (spot.kind === 'rfi') return t('action.limp')
        if (spot.kind === 'vsLimp') return t('action.overLimp', { amount })
        return t('action.call', { amount })
      case 'raise':
        if (spot.kind === 'rfi') return t('action.open', { amount })
        if (spot.kind === 'vsOpen') return t('action.threeBet', { amount })
        if (spot.kind === 'vs4bet') return t('action.allIn', { amount })
        if (spot.kind === 'vsLimp') return t('action.iso', { amount })
        return t('action.fourBet', { amount })
    }
  }
}

/** Short action name for strategy texts; BB facing limps "calls" by checking. */
export function useActionName() {
  const { t } = useTranslation()
  return (spot: Spot, action: Action): string =>
    bbChecks(spot) && action === 'call' ? t('actionName.check') : t(`actionName.${action}`)
}

/** Raise size must be typed in (size input on, not an all-in). */
export function needsSize(option: ActionOption, sizeInput: boolean): boolean {
  return sizeInput && option.action === 'raise' && option.rule !== undefined && option.rule.kind !== 'allIn'
}
