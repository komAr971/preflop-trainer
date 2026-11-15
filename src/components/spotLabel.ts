import { useTranslation } from 'react-i18next'
import type { Spot } from '../core/chart'
import { usePositionName } from './usePositionName'

export function useSpotLabel() {
  const { t } = useTranslation()
  const pos = usePositionName()
  return (spot: Spot) =>
    spot.kind === 'rfi'
      ? t('spotLabel.rfi', { hero: pos(spot.hero) })
      : t(`spotLabel.${spot.kind}`, { hero: pos(spot.hero), villain: pos(spot.villain) })
}
