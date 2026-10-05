import type { DailyValues, NormDay, StationNorms } from '../types'
import { DAYS_IN_NORM_YEAR, dayOfYear } from './dates'
import { mean, nonNull, percentiles, roundTo } from './stats'

/** Values from d−3…d+3 feed the norm for day d: a 7-day centred window. */
export const NORM_WINDOW_HALF_WIDTH_DAYS = 3
export const NORM_SMOOTHING_WINDOW_DAYS = 2 * NORM_WINDOW_HALF_WIDTH_DAYS + 1

const NORM_PERCENTILES = [10, 25, 50, 75, 90] as const

/** Groups non-null values into buckets by day of year; index 0 is day 1. */
export function bucketByDayOfYear(time: readonly string[], values: DailyValues): number[][] {
  if (time.length !== values.length) {
    throw new RangeError(`time has ${time.length} entries but values has ${values.length}`)
  }
  const buckets: number[][] = Array.from({ length: DAYS_IN_NORM_YEAR }, () => [])
  time.forEach((date, i) => {
    const value = values[i]
    if (value !== null) buckets[dayOfYear(date) - 1].push(value)
  })
  return buckets
}

/** Window of day-of-year indices (0-based) around `index`, wrapping across the year end. */
export function windowIndices(index: number, halfWidth = NORM_WINDOW_HALF_WIDTH_DAYS): number[] {
  const indices: number[] = []
  for (let offset = -halfWidth; offset <= halfWidth; offset++) {
    indices.push((index + offset + DAYS_IN_NORM_YEAR) % DAYS_IN_NORM_YEAR)
  }
  return indices
}

/**
 * Day-of-year climatology of a daily discharge series: p10/p25/median/p75/p90
 * over a ±3-day window across all years, rounded to 0.1 m³/s.
 */
export function computeNorms(time: readonly string[], values: DailyValues): StationNorms {
  const buckets = bucketByDayOfYear(time, values)
  const doy = buckets.map((_, index): NormDay => {
    const sample = windowIndices(index).flatMap((i) => buckets[i])
    if (sample.length === 0) {
      throw new RangeError(`No values for day of year ${index + 1}`)
    }
    const [p10, p25, p50, p75, p90] = percentiles(sample, NORM_PERCENTILES).map((v) =>
      roundTo(v, 1),
    )
    return { p10, p25, median: p50, p75, p90 }
  })
  return { meanAnnual: roundTo(mean(nonNull(values)), 1), doy }
}
