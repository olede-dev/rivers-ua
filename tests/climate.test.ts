import { describe, expect, it } from 'vitest'

import { classify, LOW_FLOW_CLASSES, TREND_CLASSES } from '../src/config/climateClasses'
import {
  countThrough,
  lowFlowDays,
  lowFlowDaysByYear,
  meanChangePct,
  summarizeClimate,
} from '../src/lib/climate'
import type { ClimateFile, StationNorms } from '../src/types'

// p10 is 10 on every day of the year.
const norms: StationNorms = {
  meanAnnual: 50,
  doy: Array.from({ length: 365 }, () => ({ p10: 10, p25: 20, median: 30, p75: 40, p90: 50 })),
}

describe('lowFlowDays', () => {
  it('takes days strictly below p10 and skips missing values', () => {
    expect(
      lowFlowDays(
        ['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04'],
        [9, 10, null, 0],
        norms,
      ),
    ).toEqual([1, 4])
  })

  it('counts 28 and 29 February as one day of year', () => {
    expect(lowFlowDays(['2024-02-28', '2024-02-29'], [1, 1], norms)).toEqual([59])
  })
})

describe('lowFlowDaysByYear', () => {
  it('splits by calendar year and leaves a year without data empty', () => {
    const time = ['2001-12-31', '2003-01-01']
    expect(lowFlowDaysByYear(time, [1, 1], norms, { from: 2001, to: 2003 })).toEqual([
      [365],
      [],
      [1],
    ])
  })
})

describe('countThrough', () => {
  it('includes the day itself', () => {
    expect(countThrough([1, 100, 101], 100)).toBe(2)
  })
})

describe('meanChangePct', () => {
  const time = ['2000-01-15', '2000-08-15', '2020-01-15', '2020-08-15']
  const values = [100, 40, 100, 20]
  const baseline = { from: 2000, to: 2000 }
  const recent = { from: 2020, to: 2020 }

  it('compares the period means', () => {
    expect(meanChangePct(time, values, baseline, recent)).toBe(-14)
  })

  it('restricts to the given months', () => {
    expect(meanChangePct(time, values, baseline, recent, [8])).toBe(-50)
  })

  it('is null when a period has no data', () => {
    expect(meanChangePct(time, values, baseline, { from: 2030, to: 2031 })).toBeNull()
  })
})

describe('summarizeClimate', () => {
  const climate: ClimateFile = {
    baseline: { from: 2000, to: 2001 },
    recent: { from: 2002, to: 2003 },
    years: { from: 2000, to: 2003 },
    source: 'test',
    stations: {
      a: {
        meanChangePct: -20,
        lowSeasonChangePct: -40,
        lowFlowDays: [[], [10], [10, 200], [5, 6, 300]],
      },
    },
  }

  it('counts every year up to today and appends the current year', () => {
    // 19 July is day 200 on the fixed 365-day calendar.
    const summary = summarizeClimate(climate, 'a', [1, 2, 3, 250], '2004-07-19')
    expect(summary?.byYear).toEqual([
      { year: 2000, days: 0 },
      { year: 2001, days: 1 },
      { year: 2002, days: 2 },
      { year: 2003, days: 2 },
      { year: 2004, days: 3 },
    ])
    expect(summary?.thisYear).toBe(3)
    expect(summary?.baselineMean).toBe(0.5)
    expect(summary?.recentMean).toBe(2)
  })

  it('leaves the current year out until its data loads', () => {
    const summary = summarizeClimate(climate, 'a', null, '2004-07-18')
    expect(summary?.thisYear).toBeNull()
    expect(summary?.byYear).toHaveLength(4)
  })

  it('is null for a station without climate data', () => {
    expect(summarizeClimate(climate, 'b', null, '2004-07-18')).toBeNull()
  })
})

describe('classify', () => {
  it('puts a bound into the lower class', () => {
    expect(classify(TREND_CLASSES, -30)?.id).toBe('strong-decrease')
    expect(classify(TREND_CLASSES, 10)?.id).toBe('stable')
    expect(classify(TREND_CLASSES, 31)?.id).toBe('strong-increase')
    expect(classify(LOW_FLOW_CLASSES, 0)?.id).toBe('none')
    expect(classify(LOW_FLOW_CLASSES, 90)?.id).toBe('extreme')
  })
})
