export const ru = {
  app: {
    title: 'Тренажёр префлопа',
    score: 'Сессия: {{correct}}/{{total}}',
    language: 'Язык',
  },
  spot: {
    rfi: 'До тебя все сбросили',
    vsOpen: '{{villain}} открыл до {{amount}}bb',
    vs3bet: 'Ты открыл {{open}}bb, {{villain}} сделал 3-бет до {{amount}}bb',
  },
  table: {
    review: 'Повтор ошибки',
    pot: 'Банк: {{amount}}bb',
    you: 'Ты',
  },
  action: {
    fold: 'Фолд',
    call: 'Колл {{amount}}bb',
    limp: 'Лимп',
    open: 'Рейз {{amount}}bb',
    threeBet: '3-бет до {{amount}}bb',
    fourBet: '4-бет до {{amount}}bb',
  },
  actionName: {
    fold: 'Фолд',
    call: 'Колл',
    raise: 'Рейз',
  },
  feedback: {
    correct: 'Верно',
    wrong: 'Ошибка',
    strategy: 'Стратегия для {{hand}}:',
    next: 'Дальше',
    nextHint: 'Пробел',
  },
} as const
