import type { Messages } from './index'

export const en: Messages = {
  app: {
    title: 'Preflop Trainer',
    score: 'Session: {{correct}}/{{total}}',
    language: 'Language',
  },
  nav: {
    train: 'Train',
    charts: 'Charts',
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
  charts: {
    create: 'New chart',
    import: 'Import JSON',
    export: 'Export',
    train: 'Train',
    edit: 'Edit',
    copy: 'Copy',
    delete: 'Delete',
    builtin: 'built-in',
    active: 'active',
    newName: 'My chart',
    copyName: '{{name}} (copy)',
    copied: 'Copied “{{name}}”',
    imported: 'Imported chart “{{name}}”',
    importFailed: 'File {{file}} was not imported:',
    moreErrors: 'and {{count}} more',
    confirmDelete: 'Delete chart “{{name}}” with its statistics?',
    noStorage: 'Browser storage is unavailable (private mode?). Charts cannot be saved.',
    editorSoon: 'The editor is coming in the next update.',
  },
  feedback: {
    correct: 'Correct',
    wrong: 'Wrong',
    strategy: 'Strategy for {{hand}}:',
    next: 'Next',
    nextHint: 'Space',
  },
}
