import type { AnomalyClass, NormDay } from '../types'

/**
 * Water-state class of discharge `q` against the day-of-year norm:
 * below p10, p10–p25, p25–p75 (inclusive), p75–p90, above p90.
 */
export function classifyDischarge(q: number | null, norm: NormDay): AnomalyClass {
  if (q === null) return 'no-data'
  if (q < norm.p10) return 'very-low'
  if (q < norm.p25) return 'low'
  if (q <= norm.p75) return 'normal'
  if (q <= norm.p90) return 'high'
  return 'very-high'
}

/** Deviation from the median norm in whole percent; `null` when it is undefined. */
export function anomalyPct(q: number | null, median: number): number | null {
  if (q === null || median <= 0) return null
  // `+ 0` turns a rounded −0 into 0.
  return Math.round((q / median - 1) * 100) + 0
}
