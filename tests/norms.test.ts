import { describe, expect, it } from 'vitest'

import { addDays } from '../src/lib/dates'
import { bucketByDayOfYear, computeNorms, windowIndices } from '../src/lib/norms'

function datesOf(year: number): string[] {
  const dates: string[] = []
  for (let date = `${year}-01-01`; date.startsWith(String(year)); date = addDays(date, 1)) {
    dates.push(date)
  }
  return dates
}

// One non-leap year whose value on each day equals its day of year (1…365).
const time2023 = datesOf(2023)
const doyValues = time2023.map((_, i) => i + 1)

describe('bucketByDayOfYear', () => {
  it('puts 29 February together with 28 February', () => {
    const buckets = bucketByDayOfYear(['2024-02-28', '2024-02-29', '2024-03-01'], [10, 20, 30])
    expect(buckets[58]).toEqual([10, 20])
    expect(buckets[59]).toEqual([30])
  })

  it('skips null values', () => {
    const buckets = bucketByDayOfYear(['2023-01-01', '2024-01-01'], [null, 7])
    expect(buckets[0]).toEqual([7])
  })
})

describe('windowIndices', () => {
  it('wraps across the year boundary', () => {
    expect(windowIndices(0)).toEqual([362, 363, 364, 0, 1, 2, 3])
    expect(windowIndices(364)).toEqual([361, 362, 363, 364, 0, 1, 2])
  })
})

describe('computeNorms', () => {
  it('produces 365 days and the mean of all values', () => {
    const norms = computeNorms(time2023, doyValues)
    expect(norms.doy).toHaveLength(365)
    expect(norms.meanAnnual).toBe(183)
  })

  it('computes percentiles over the ±3-day window', () => {
    // Day 100 window: 97…103.
    expect(computeNorms(time2023, doyValues).doy[99]).toEqual({
      p10: 97.6,
      p25: 98.5,
      median: 100,
      p75: 101.5,
      p90: 102.4,
    })
  })

  it('takes 1 January’s window from late December', () => {
    // Window: 363, 364, 365, 1, 2, 3, 4.
    expect(computeNorms(time2023, doyValues).doy[0]).toEqual({
      p10: 1.6,
      p25: 2.5,
      median: 4,
      p75: 363.5,
      p90: 364.4,
    })
  })

  it('ignores null values inside the window', () => {
    const withGap = doyValues.map((v) => (v === 100 ? null : v))
    // Window without day 100: 97, 98, 99, 101, 102, 103.
    expect(computeNorms(time2023, withGap).doy[99]).toMatchObject({ p10: 97.5, median: 100 })
  })

  it('rounds to one decimal place', () => {
    const thirds = doyValues.map((v) => v / 3)
    // Day 100 median: 100 / 3 = 33.33…
    expect(computeNorms(time2023, thirds).doy[99].median).toBe(33.3)
  })

  it('fails when a day of year has no data within its window', () => {
    const januaryOnly = time2023.slice(0, 31)
    expect(() => computeNorms(januaryOnly, doyValues.slice(0, 31))).toThrow(/No values/)
  })
})
