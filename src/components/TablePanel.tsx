import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionBar } from './ActionBar'
import { HOTKEYS, needsSize } from './actionLabels'
import { BetSizer } from './BetSizer'
import { Feedback } from './Feedback'
import { Table } from './Table'
import { useDecisionTimer } from './useDecisionTimer'
import { usePositionName } from './usePositionName'
import type { Action } from '../core/chart'
import { PRESET_MULTIPLIERS, presetSize } from '../core/betPresets'
import { fmtBb } from '../core/format'
import type { Scenario } from '../core/scenario'
import { useTrainer } from '../store/trainerStore'
import { playSound, type SoundKind } from '../ui/sound'

/** Correct answers move on by themselves: a bit faster when several tables run. */
const AUTO_NEXT_MS = { single: 700, multi: 500 }

/** Handles a key for this table; returns true when used. */
export type KeyHandler = (key: string, e: KeyboardEvent) => boolean

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

interface Props {
  index: number
  /** Several tables on screen: compact feedback over the table, full explanation in the side panel. */
  multi: boolean
  active: boolean
  register: (index: number, handler: KeyHandler | null) => void
}

export function TablePanel({ index, multi, active, register }: Props) {
  const { t } = useTranslation()
  const { question, answer } = useTrainer((s) => s.tables[index])
  const ready = useTrainer((s) => s.ready)
  const settings = useTrainer((s) => s.settings)
  const chart = useTrainer((s) => s.chart)
  const submit = useTrainer((s) => s.submit)
  const nextAll = useTrainer((s) => s.next)
  const setReviewing = useTrainer((s) => s.setReviewing)
  const next = useCallback(() => nextAll(index), [nextAll, index])
  const pos = usePositionName()

  const sound = (kind: SoundKind) => {
    if (settings.sound && settings.soundKinds[kind]) playSound(kind, settings.volume)
  }
  const onTick = useCallback(() => {
    const { sound: on, soundKinds, volume } = useTrainer.getState().settings
    if (on && soundKinds.tick) playSound('tick', volume)
  }, [])
  const timer = useDecisionTimer(index, onTick)
  const spotText = useSpotText(question.scenario)
  const raiseOption = question.scenario.actions.find((o) => o.action === 'raise')
  const raiseNeedsSize = raiseOption !== undefined && needsSize(raiseOption, settings.sizeInput)
  const [raiseSize, setRaiseSize] = useState(question.scenario.minRaiseBb)

  // Each new hand starts the bet sizer at the minimum raise, like a poker client.
  useEffect(() => setRaiseSize(question.scenario.minRaiseBb), [question.id, question.scenario.minRaiseBb])

  const act = useCallback(
    (action: Action) => submit(action, action === 'raise' && raiseNeedsSize ? raiseSize : undefined, index),
    [submit, raiseNeedsSize, raiseSize, index],
  )

  // Keyboard: F/C/R to answer, Space/Enter/Esc for next. The page sends keys to the active table only.
  useEffect(() => {
    register(index, (key, e) => {
      if (!answer) {
        const action = (Object.keys(HOTKEYS) as Action[]).find((a) => HOTKEYS[a] === key)
        if (!action || !question.scenario.actions.some((o) => o.action === action)) return false
        act(action)
        return true
      }
      if (key === ' ' || key === 'enter' || key === 'escape') {
        e.preventDefault()
        next()
        return true
      }
      return false
    })
    return () => register(index, null)
  }, [register, index, answer, question, act, next])

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

  useEffect(() => {
    if (!answer?.correct) return
    const id = window.setTimeout(next, multi ? AUTO_NEXT_MS.multi : AUTO_NEXT_MS.single)
    return () => window.clearTimeout(id)
  }, [answer, next, multi])

  const feedback = answer && (
    <Feedback
      answer={answer}
      hand={question.hand}
      freqs={question.freqs}
      spot={question.scenario.spot}
      compiled={chart.spots.get(question.spotKey)}
      threshold={settings.threshold}
      onNext={next}
      compact={multi}
      onWhy={() => setReviewing(index)}
    />
  )

  return (
    <section
      className={`table-cell${active ? ' is-active' : ''}`}
      data-testid="table-cell"
      data-table={index}
      data-active={active}
    >
      <p className="spot-text" data-testid="spot-text" data-spot={question.spotKey}>
        <b>{pos(question.scenario.spot.hero)}</b> · {spotText}
        {question.isReview && <span className="badge-review">{t('table.review')}</span>}
        {settings.mixedMode === 'rng' && (
          <span className="badge-roll" data-testid="roll" title={t('table.rollHint')}>
            🎲 {question.roll}
          </span>
        )}
      </p>
      <Table scenario={question.scenario} cards={question.cards} questionId={question.id} timer={timer} />
      {/* Always present when sizes are typed, so the layout doesn't jump; inactive for all-ins. */}
      {settings.sizeInput && (
        <BetSizer
          min={question.scenario.minRaiseBb}
          max={100}
          value={raiseNeedsSize ? raiseSize : 100}
          onChange={setRaiseSize}
          onSubmit={() => act('raise')}
          disabled={answer !== null || !raiseNeedsSize}
          presets={PRESET_MULTIPLIERS.map((m) => ({ label: `x${m}`, value: presetSize(m, question.scenario) }))}
        />
      )}
      <ActionBar
        spot={question.scenario.spot}
        options={question.scenario.actions}
        disabled={answer !== null}
        chosen={answer?.action ?? undefined}
        accepted={answer?.accepted}
        onAction={act}
        raiseSize={raiseNeedsSize ? raiseSize : undefined}
      />
      {multi ? (
        // Over the controls of this table only; the other tables keep playing.
        answer && <div className="table-feedback">{feedback}</div>
      ) : (
        <>
          <div className="trainer-links">
            <a href="#/draw">✏️ {t('draw.open')}</a>
          </div>
          <div className="feedback-slot">{answer?.correct && feedback}</div>
          {/* A mistake opens in a centred modal: the whole explanation fits, long parts scroll inside. */}
          {answer && !answer.correct && (
            <div className="modal-backdrop" data-testid="mistake-modal">
              <div className="modal" role="dialog" aria-modal="true" aria-label={t('feedback.wrong')}>
                {feedback}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
