import { useTranslation } from 'react-i18next'
import { fmtBb } from '../core/format'
import type { SizeRule } from '../core/scenario'

/** "3-bet in position: 3bb × 3 = 9bb" */
export function useSizeRuleText() {
  const { t } = useTranslation()
  return (rule: SizeRule): string => {
    const to = fmtBb(rule.to)
    switch (rule.kind) {
      case 'open':
        return t('sizeRule.open', { to })
      case 'allIn':
        return t('sizeRule.allIn', { to })
      case 'threeBet':
      case 'fourBet': {
        const exact = Math.abs(rule.base * rule.mult - rule.to) < 1e-9
        return t(`sizeRule.${rule.kind}`, {
          pos: rule.kind === 'threeBet' ? t(rule.ip ? 'sizeRule.ip' : 'sizeRule.oop') : '',
          base: fmtBb(rule.base),
          mult: rule.mult,
          eq: exact ? '=' : '≈',
          to,
        })
      }
      case 'iso':
        return rule.extraLimpers
          ? t('sizeRule.isoExtra', { pos: t(rule.ip ? 'sizeRule.ip' : 'sizeRule.oop'), base: fmtBb(rule.base), extra: rule.extraLimpers, to })
          : t('sizeRule.iso', { pos: t(rule.ip ? 'sizeRule.ip' : 'sizeRule.oop'), to })
    }
  }
}
