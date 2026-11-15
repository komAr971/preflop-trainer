import type { ChartFile } from '../core/chart'

/**
 * Baseline 6-max 100bb ranges for NL2–NL10. Pure strategies (no mixing).
 * Not solver output: a simplified starting point the user verifies and edits.
 */
export const starterChart: ChartFile = {
  version: 1,
  name: 'Базовый 6-max 100bb',
  description: 'Стартовый набор: RFI, против опена, против 3-бета. Сверьте со своими чартами.',
  format: { players: 6, stackBb: 100 },
  sizings: { openBb: 2.5, sbOpenBb: 3, threeBetIpX: 3, threeBetOopX: 4, fourBetX: 2.2 },
  spots: [
    // ── RFI ──
    { spot: { kind: 'rfi', hero: 'UTG' }, actions: { raise: '22+,A2s+,KTs+,QTs+,JTs,T9s,98s,AJo+,KQo' } },
    { spot: { kind: 'rfi', hero: 'HJ' }, actions: { raise: '22+,A2s+,K9s+,Q9s+,J9s+,T9s,98s,87s,ATo+,KJo+,QJo' } },
    {
      spot: { kind: 'rfi', hero: 'CO' },
      actions: { raise: '22+,A2s+,K7s+,Q9s+,J9s+,T8s+,97s+,87s,76s,65s,A9o+,KTo+,QTo+,JTo' },
    },
    {
      spot: { kind: 'rfi', hero: 'BTN' },
      actions: { raise: '22+,A2s+,K2s+,Q5s+,J7s+,T7s+,96s+,85s+,75s+,64s+,54s,A2o+,K9o+,Q9o+,J9o+,T9o,98o' },
    },
    {
      spot: { kind: 'rfi', hero: 'SB' },
      actions: { raise: '22+,A2s+,K2s+,Q5s+,J7s+,T7s+,96s+,86s+,75s+,65s,54s,A2o+,K9o+,Q9o+,J9o+,T9o' },
    },

    // ── vs open: UTG ──
    { spot: { kind: 'vsOpen', hero: 'HJ', villain: 'UTG' }, actions: { raise: 'QQ+,AK,A5s', call: 'JJ-99,AQs-AJs,KQs' } },
    {
      spot: { kind: 'vsOpen', hero: 'CO', villain: 'UTG' },
      actions: { raise: 'QQ+,AK,A5s-A4s', call: 'JJ-88,AQs-ATs,KQs,KJs,QJs,JTs,AQo' },
    },
    {
      spot: { kind: 'vsOpen', hero: 'BTN', villain: 'UTG' },
      actions: { raise: 'QQ+,AK,A5s-A4s', call: 'JJ-66,AQs-ATs,KQs,KJs,QJs,JTs,T9s,98s,AQo' },
    },
    { spot: { kind: 'vsOpen', hero: 'SB', villain: 'UTG' }, actions: { raise: 'TT+,AQs+,AKo,A5s,KQs' } },
    {
      spot: { kind: 'vsOpen', hero: 'BB', villain: 'UTG' },
      actions: {
        raise: 'QQ+,AK,A5s-A4s',
        call: 'JJ-22,AQs-A6s,A3s-A2s,KTs+,QTs+,J9s+,T8s+,97s+,86s+,75s+,65s,54s,AQo-ATo,KJo+,QJo',
      },
    },

    // ── vs open: HJ ──
    {
      spot: { kind: 'vsOpen', hero: 'CO', villain: 'HJ' },
      actions: { raise: 'JJ+,AQs+,AKo,A5s-A4s', call: 'TT-77,AJs-ATs,KQs,KJs,QJs,JTs,AQo' },
    },
    {
      spot: { kind: 'vsOpen', hero: 'BTN', villain: 'HJ' },
      actions: { raise: 'JJ+,AQs+,AQo+,A5s-A4s', call: 'TT-55,AJs-A9s,KTs+,QTs+,J9s+,T9s,98s,87s,AJo,KQo' },
    },
    { spot: { kind: 'vsOpen', hero: 'SB', villain: 'HJ' }, actions: { raise: 'TT+,AJs+,AQo+,KQs,A5s-A4s' } },
    {
      spot: { kind: 'vsOpen', hero: 'BB', villain: 'HJ' },
      actions: {
        raise: 'JJ+,AQs+,AKo,A5s-A4s',
        call: 'TT-22,AJs-A6s,A3s-A2s,K8s+,Q9s+,J8s+,T8s+,97s+,86s+,75s+,64s+,54s,AQo-ATo,KTo+,QTo+,JTo',
      },
    },

    // ── vs open: CO ──
    {
      spot: { kind: 'vsOpen', hero: 'BTN', villain: 'CO' },
      actions: {
        raise: 'TT+,AJs+,AQo+,KQs,A5s-A4s',
        call: '99-44,ATs-A8s,KJs-KTs,QJs-QTs,JTs,J9s,T9s,98s,87s,76s,AJo,KQo',
      },
    },
    { spot: { kind: 'vsOpen', hero: 'SB', villain: 'CO' }, actions: { raise: '99+,ATs+,AJo+,KJs+,QJs,A5s-A4s' } },
    {
      spot: { kind: 'vsOpen', hero: 'BB', villain: 'CO' },
      actions: {
        raise: 'TT+,AJs+,AQo+,KQs,A5s-A4s',
        call: '99-22,ATs-A6s,A3s-A2s,KJs-K5s,Q7s+,J7s+,T7s+,96s+,85s+,75s+,64s+,53s+,AJo-A8o,KTo+,QTo+,JTo',
      },
    },

    // ── vs open: BTN ──
    { spot: { kind: 'vsOpen', hero: 'SB', villain: 'BTN' }, actions: { raise: '88+,A8s+,ATo+,KTs+,QTs+,JTs,A5s-A4s,KJo+' } },
    {
      spot: { kind: 'vsOpen', hero: 'BB', villain: 'BTN' },
      actions: {
        raise: '99+,ATs+,AJo+,KJs+,A5s-A4s',
        call: '88-22,A9s-A6s,A3s-A2s,KTs-K2s,Q2s+,J4s+,T6s+,96s+,85s+,74s+,63s+,53s+,43s,ATo-A2o,K8o+,Q9o+,J9o+,T8o+,98o,87o',
      },
    },

    // ── vs open: SB ──
    {
      spot: { kind: 'vsOpen', hero: 'BB', villain: 'SB' },
      actions: {
        raise: '88+,A9s+,ATo+,KTs+,QJs,A5s-A4s,KJo+',
        call: '77-22,A8s-A6s,A3s-A2s,K9s-K2s,QTs-Q2s,J3s+,T5s+,95s+,85s+,74s+,63s+,53s+,43s,A9o-A2o,KTo-K5o,Q7o+,J8o+,T8o+,97o+,87o,76o',
      },
    },

    // ── vs 3-bet: UTG opened ──
    ...(['HJ', 'CO', 'BTN'] as const).map((villain) => ({
      spot: { kind: 'vs3bet' as const, hero: 'UTG' as const, villain },
      actions: { raise: 'KK+,AKs,A5s', call: 'QQ-88,AKo,AQs-AJs,KQs' },
    })),
    ...(['SB', 'BB'] as const).map((villain) => ({
      spot: { kind: 'vs3bet' as const, hero: 'UTG' as const, villain },
      actions: { raise: 'KK+,AK,A5s', call: 'QQ-77,AQs-ATs,KQs,KJs,QJs,JTs,AQo' },
    })),

    // ── vs 3-bet: HJ opened ──
    ...(['CO', 'BTN'] as const).map((villain) => ({
      spot: { kind: 'vs3bet' as const, hero: 'HJ' as const, villain },
      actions: { raise: 'QQ+,AK,A5s-A4s', call: 'JJ-88,AQs-ATs,KQs,KJs' },
    })),
    ...(['SB', 'BB'] as const).map((villain) => ({
      spot: { kind: 'vs3bet' as const, hero: 'HJ' as const, villain },
      actions: { raise: 'QQ+,AK,A5s-A4s', call: 'JJ-66,AQs-ATs,KQs-KTs,QJs,JTs,T9s,AQo' },
    })),

    // ── vs 3-bet: CO opened ──
    {
      spot: { kind: 'vs3bet', hero: 'CO', villain: 'BTN' },
      actions: { raise: 'QQ+,AK,A5s-A4s', call: 'JJ-77,AQs-ATs,KQs-KTs,QJs,JTs,T9s,AQo' },
    },
    ...(['SB', 'BB'] as const).map((villain) => ({
      spot: { kind: 'vs3bet' as const, hero: 'CO' as const, villain },
      actions: { raise: 'QQ+,AK,A5s-A3s', call: 'JJ-55,AQs-A9s,KQs-KTs,QJs-QTs,JTs,T9s,98s,AQo,AJo' },
    })),

    // ── vs 3-bet: BTN opened ──
    ...(['SB', 'BB'] as const).map((villain) => ({
      spot: { kind: 'vs3bet' as const, hero: 'BTN' as const, villain },
      actions: {
        raise: 'JJ+,AK,AQs,A5s-A3s',
        call: 'TT-44,AJs-A6s,KQs-K9s,QJs-Q9s,J9s+,T8s+,98s,87s,76s,AQo-AJo,KQo',
      },
    })),

    // ── vs 3-bet: SB opened ──
    {
      spot: { kind: 'vs3bet', hero: 'SB', villain: 'BB' },
      actions: { raise: 'JJ+,AK,AQs,A5s-A4s', call: 'TT-55,AJs-A8s,KQs-KTs,QJs-QTs,JTs,T9s,98s,AQo-AJo,KQo' },
    },
  ],
}
