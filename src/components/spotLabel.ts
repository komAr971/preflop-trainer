import { useTranslation } from 'react-i18next'
import type { Spot } from '../core/chart'

export function useSpotLabel() {
  const { t } = useTranslation()
  return (spot: Spot) =>
    spot.kind === 'rfi'
      ? t('spotLabel.rfi', { hero: spot.hero })
      : t(`spotLabel.${spot.kind}`, { hero: spot.hero, villain: spot.villain })
}
