import { useTranslation } from 'react-i18next'
import { ACTIONS, type CompiledSpot } from '../core/chart'
import { explainMistake } from '../core/explain'
import type { Hand } from '../core/hands'
import type { AnswerResult } from '../store/trainerStore'
import { useActionName } from './actionLabels'
import { RangeGrid } from './RangeGrid'

interface Props {
  compiled: CompiledSpot
  hand: Hand
  answer: AnswerResult
  threshold: number
}

/** Explains a wrong answer and shows the spot chart with the hand outlined. */
export function MistakeWhy({ compiled, hand, answer, threshold }: Props) {
  const { t } = useTranslation()
  const name = useActionName()
  const spot = compiled.spot
  // Time ran out: nothing was chosen, the feedback already names the right action.
  if (answer.action === null) return null
  const e = explainMistake(compiled, hand, answer.action, answer.accepted, {
    sizeWrong: answer.size?.ok === false,
    rng: answer.roll !== undefined,
  })
  const best = e.accepted.map((a) => name(spot, a)).join(t('why.or'))
  const widths = ACTIONS.filter((a) => e.widths[a] > 0)
    .map((a) => `${name(spot, a)} ${e.widths[a].toFixed(1)}%`)
    .join(' · ')
  const border = e.border.map((b) => `${b.hand} — ${name(spot, b.action)}`).join(', ')

  return (
    <section className="why" data-testid="why">
      <h3>{t('why.title')}</h3>
      <p data-testid="why-reason">
        {t(`why.${e.reason}`, {
          hand,
          chosen: name(spot, e.chosen),
          best,
          freq: Math.round(e.chosenFreq * 100),
          threshold: Math.round(threshold * 100),
          roll: answer.roll,
        })}
      </p>
      <p className="muted">{t('why.widths', { list: widths })}</p>
      {border && <p className="muted">{t('why.border', { list: border })}</p>}
      <p className="muted">{t('why.chart', { hand })}</p>
      <div className="why-chart">
        <RangeGrid spot={compiled} highlight={hand} />
      </div>
    </section>
  )
}
