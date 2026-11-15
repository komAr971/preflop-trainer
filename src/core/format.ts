/** 2.5 → "2.5", 10 → "10". */
export const fmtBb = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1))
