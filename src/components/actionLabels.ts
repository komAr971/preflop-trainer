import { useTranslation } from 'react-i18next'
import type { Action, Spot } from '../core/chart'
import { fmtBb } from '../core/format'
import type { ActionOption } from '../core/scenario'

export const HOTKEYS: Record<Action, string> = { fold: 'f', call: 'c', raise: 'r' }

export function useActionLabel() {
  const { t } = useTranslation()
  return (spot: Spot, option: ActionOption): string => {
    const amount = option.toBb !== undefined ? fmtBb(option.toBb) : ''
    switch (option.action) {
      case 'fold':
        return t('action.fold')
      case 'call':
        return spot.kind === 'rfi' ? t('action.limp') : t('action.call', { amount })
      case 'raise':
        if (spot.kind === 'rfi') return t('action.open', { amount })
        if (spot.kind === 'vsOpen') return t('action.threeBet', { amount })
        if (spot.kind === 'vs4bet') return t('action.allIn', { amount })
        return t('action.fourBet', { amount })
    }
  }
}
