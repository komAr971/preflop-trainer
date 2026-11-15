import { useTranslation } from 'react-i18next'
import type { Spot } from '../core/chart'
import { usePositionName } from './usePositionName'

export function useSpotLabel() {
  const { t } = useTranslation()
  const pos = usePositionName()
  return (spot: Spot) => {
    switch (spot.kind) {
      case 'rfi':
        return t('spotLabel.rfi', { hero: pos(spot.hero) })
      case 'vsLimp':
        return t('spotLabel.vsLimp', { hero: pos(spot.hero), limpers: spot.limpers === 3 ? '3+' : spot.limpers })
      default:
        return t(`spotLabel.${spot.kind}`, { hero: pos(spot.hero), villain: pos(spot.villain) })
    }
  }
}
