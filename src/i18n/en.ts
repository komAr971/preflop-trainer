import type { Messages } from './index'

export const en: Messages = {
  app: {
    title: 'Preflop Trainer',
    score: 'Session: {{correct}}/{{total}}',
    language: 'Language',
  },
  spot: {
    rfi: 'Folded to you',
    vsOpen: '{{villain}} opened to {{amount}}bb',
    vs3bet: 'You opened {{open}}bb, {{villain}} 3-bet to {{amount}}bb',
  },
  table: {
    review: 'Mistake review',
    pot: 'Pot: {{amount}}bb',
    you: 'You',
  },
  action: {
    fold: 'Fold',
    call: 'Call {{amount}}bb',
    limp: 'Limp',
    open: 'Raise {{amount}}bb',
    threeBet: '3-bet to {{amount}}bb',
    fourBet: '4-bet to {{amount}}bb',
  },
  actionName: {
    fold: 'Fold',
    call: 'Call',
    raise: 'Raise',
  },
  feedback: {
    correct: 'Correct',
    wrong: 'Wrong',
    strategy: 'Strategy for {{hand}}:',
    next: 'Next',
    nextHint: 'Space',
  },
}
