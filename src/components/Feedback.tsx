import { useTranslation } from 'react-i18next'
import { ACTIONS, type Frequencies, type Spot } from '../core/chart'
import { rollIntervals } from '../core/trainer'
import type { Hand } from '../core/hands'
import type { AnswerResult } from '../store/trainerStore'
import { useActionName } from './actionLabels'

interface Props {
  answer: AnswerResult
  hand: Hand
  freqs: Frequencies
  spot: Spot
  onNext: () => void
}

export function Feedback({ answer, hand, freqs, spot, onNext }: Props) {
  const { t } = useTranslation()
  const name = useActionName()
  return (
    <div className={`feedback ${answer.correct ? 'ok' : 'bad'}`} role="status">
      <strong className="feedback-title">{answer.correct ? t('feedback.correct') : t('feedback.wrong')}</strong>
      <span className="feedback-strategy">
        {t('feedback.strategy', { hand })}{' '}
        {ACTIONS.filter((a) => freqs[a] > 0)
          .map((a) => `${name(spot, a)} ${Math.round(freqs[a] * 100)}%`)
          .join(' · ')}
        {answer.roll !== undefined && rollIntervals(freqs).length > 1 && (
          <span className="feedback-roll" data-testid="roll-explain">
            {' — '}
            {t('feedback.roll', { roll: answer.roll })}{' '}
            {rollIntervals(freqs)
              .map((i) => `${i.from}–${i.to} ${name(spot, i.action)}`)
              .join(', ')}
          </span>
        )}
      </span>
      <button type="button" className="next" onClick={onNext} autoFocus>
        {t('feedback.next')} <kbd>{t('feedback.nextHint')}</kbd>
      </button>
    </div>
  )
}
