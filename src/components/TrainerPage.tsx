import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionBar } from './ActionBar'
import { HOTKEYS } from './actionLabels'
import { Feedback } from './Feedback'
import { Table } from './Table'
import type { Action } from '../core/chart'
import { fmtBb } from '../core/format'
import type { Scenario } from '../core/scenario'
import { useTrainer } from '../store/trainerStore'
import { playSound } from '../ui/sound'

const AUTO_NEXT_MS = 700

function useSpotText(s: Scenario): string {
  const { t } = useTranslation()
  const { spot } = s
  if (spot.kind === 'rfi') return t('spot.rfi')
  if (spot.kind === 'vsOpen') return t('spot.vsOpen', { villain: spot.villain, amount: fmtBb(s.facingBb!) })
  return t('spot.vs3bet', { villain: spot.villain, amount: fmtBb(s.facingBb!), open: fmtBb(s.heroOpenBb!) })
}

export function TrainerPage() {
  const { t } = useTranslation()
  const { ready, question, answer, submit, next, settings } = useTrainer()
  const volume = settings.sound ? settings.volume : 0
  const spotText = useSpotText(question.scenario)

  // Keyboard: F/C/R to answer, Space/Enter for next.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!ready || e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (!answer) {
        const action = (Object.keys(HOTKEYS) as Action[]).find((a) => HOTKEYS[a] === key)
        if (action && question.scenario.actions.some((o) => o.action === action)) submit(action)
      } else if (key === ' ' || key === 'enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, answer, question, submit, next])

  // Sounds: deal (+ chips when facing a bet) on each new hand, result on answer.
  useEffect(() => {
    if (!ready) return
    playSound('deal', volume)
    if (question.scenario.facingBb) {
      const id = window.setTimeout(() => playSound('chip', volume), 180)
      return () => window.clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on a new hand, not on volume change
  }, [ready, question.id])

  useEffect(() => {
    if (answer) playSound(answer.correct ? 'correct' : 'wrong', volume)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when an answer arrives
  }, [answer])

  // Correct answers move on automatically.
  useEffect(() => {
    if (!answer?.correct) return
    const id = window.setTimeout(next, AUTO_NEXT_MS)
    return () => window.clearTimeout(id)
  }, [answer, next])

  return (
    <>
      {ready && (
        <main className="main">
          <p className="spot-text" data-testid="spot-text">
            <b>{question.scenario.spot.hero}</b> · {spotText}
            {question.isReview && <span className="badge-review">{t('table.review')}</span>}
          </p>
          <Table scenario={question.scenario} cards={question.cards} questionId={question.id} />
          <ActionBar
            spot={question.scenario.spot}
            options={question.scenario.actions}
            disabled={answer !== null}
            chosen={answer?.action}
            accepted={answer?.accepted}
            onAction={submit}
          />
          <div className="feedback-slot">
            {answer && <Feedback answer={answer} hand={question.hand} freqs={question.freqs} onNext={next} />}
          </div>
        </main>
      )}
    </>
  )
}
