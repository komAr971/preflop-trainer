import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionBar } from './ActionBar'
import { HOTKEYS, needsSize, useActionLabel } from './actionLabels'
import { SizeEntry } from './SizeEntry'
import { Feedback } from './Feedback'
import { Table } from './Table'
import type { Action } from '../core/chart'
import { fmtBb } from '../core/format'
import type { Scenario } from '../core/scenario'
import { useTrainer } from '../store/trainerStore'
import { usePositionName } from './usePositionName'
import { playSound, type SoundKind } from '../ui/sound'

const AUTO_NEXT_MS = 700

function useSpotText(s: Scenario): string {
  const { t } = useTranslation()
  const pos = usePositionName()
  const { spot } = s
  if (spot.kind === 'rfi') return t('spot.rfi')
  if (spot.kind === 'vsOpen') return t('spot.vsOpen', { villain: pos(spot.villain), amount: fmtBb(s.facingBb!) })
  if (spot.kind === 'vsLimp') return t('spot.vsLimp', { limpers: s.limpers!.map(pos).join(', '), count: s.limpers!.length })
  if (spot.kind === 'vs4bet') {
    return t('spot.vs4bet', { villain: pos(spot.villain), amount: fmtBb(s.facingBb!), threeBet: fmtBb(s.heroThreeBetBb!) })
  }
  return t('spot.vs3bet', { villain: pos(spot.villain), amount: fmtBb(s.facingBb!), open: fmtBb(s.heroOpenBb!) })
}

export function TrainerPage() {
  const { t } = useTranslation()
  const { ready, question, answer, submit, next, settings } = useTrainer()
  const pos = usePositionName()
  const sound = (kind: SoundKind) => {
    if (settings.sound && settings.soundKinds[kind]) playSound(kind, settings.volume)
  }
  const spotText = useSpotText(question.scenario)
  const label = useActionLabel()
  const [askingSize, setAskingSize] = useState(false)
  const raiseOption = question.scenario.actions.find((o) => o.action === 'raise')
  const raiseNeedsSize = raiseOption !== undefined && needsSize(raiseOption, settings.sizeInput)

  // A new hand closes the size prompt.
  useEffect(() => setAskingSize(false), [question.id])

  // Keyboard: F/C/R to answer, Space/Enter for next.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!ready || askingSize || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.target instanceof HTMLInputElement) return
      const key = e.key.toLowerCase()
      if (!answer) {
        const action = (Object.keys(HOTKEYS) as Action[]).find((a) => HOTKEYS[a] === key)
        if (!action || !question.scenario.actions.some((o) => o.action === action)) return
        if (action === 'raise' && raiseNeedsSize) {
          e.preventDefault()
          setAskingSize(true)
        } else submit(action)
      } else if (key === ' ' || key === 'enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, answer, question, submit, next, askingSize, raiseNeedsSize])

  // Sounds: deal (+ chips when facing a bet) on each new hand, result on answer.
  useEffect(() => {
    if (!ready) return
    sound('deal')
    if (question.scenario.facingBb) {
      const id = window.setTimeout(() => sound('chip'), 180)
      return () => window.clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on a new hand, not on settings change
  }, [ready, question.id])

  useEffect(() => {
    if (answer) sound(answer.correct ? 'correct' : 'wrong')
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
            <b>{pos(question.scenario.spot.hero)}</b> · {spotText}
            {question.isReview && <span className="badge-review">{t('table.review')}</span>}
            {settings.mixedMode === 'rng' && (
              <span className="badge-roll" data-testid="roll" title={t('table.rollHint')}>
                🎲 {question.roll}
              </span>
            )}
          </p>
          <Table scenario={question.scenario} cards={question.cards} questionId={question.id} />
          {askingSize && raiseOption ? (
            <SizeEntry
              label={label(question.scenario.spot, raiseOption, true)}
              onCancel={() => setAskingSize(false)}
              onSubmit={(size) => {
                setAskingSize(false)
                submit('raise', size)
              }}
            />
          ) : (
            <ActionBar
              spot={question.scenario.spot}
              options={question.scenario.actions}
              disabled={answer !== null}
              chosen={answer?.action}
              accepted={answer?.accepted}
              onAction={submit}
              sizeInput={settings.sizeInput}
              onAskSize={() => setAskingSize(true)}
            />
          )}
          <div className="trainer-links">
            <a href="#/draw">✏️ {t('draw.open')}</a>
          </div>
          <div className="feedback-slot">
            {answer && <Feedback answer={answer} hand={question.hand} freqs={question.freqs} spot={question.scenario.spot} onNext={next} />}
          </div>
        </main>
      )}
    </>
  )
}
