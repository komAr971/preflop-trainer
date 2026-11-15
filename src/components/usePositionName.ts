import type { Position } from '../core/chart'
import { positionName } from '../core/chart'
import { useTrainer } from '../store/trainerStore'

export function usePositionName(): (p: Position) => string {
  const middle = useTrainer((s) => s.settings.middleName)
  return (p) => positionName(p, middle)
}
