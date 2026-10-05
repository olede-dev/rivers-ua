import type { ClimateFile, DailyValues, StationNorms } from '../types'
import { dayOfYear } from './dates'
import { mean, nonNull } from './stats'

/** Inclusive year range, e.g. `{ from: 1991, to: 2005 }`. */
export interface YearRange {
  from: number
  to: number
}

const yearOf = (date: string) => Number(date.slice(0, 4))

/**
 * Days of year (1…365) on which discharge fell below the day's p10 norm: the low-flow
 * days of one series. A date repeated by 29 February counts once, as day 59 does.
 */
export function lowFlowDays(
  time: readonly string[],
  values: DailyValues,
  norms: StationNorms,
): number[] {
  const days = new Set<number>()
  time.forEach((date, i) => {
    const q = values[i]
    const doy = dayOfYear(date)
    if (q !== null && q < norms.doy[doy - 1].p10) days.add(doy)
  })
  return [...days].sort((a, b) => a - b)
}

/** Low-flow days per calendar year of `years`, in year order; a year with no data is empty. */
export function lowFlowDaysByYear(
  time: readonly string[],
  values: DailyValues,
  norms: StationNorms,
  years: YearRange,
): number[][] {
  const result: number[][] = []
  for (let year = years.from; year <= years.to; year++) {
    const indices = time.flatMap((date, i) => (yearOf(date) === year ? [i] : []))
    result.push(
      lowFlowDays(
        indices.map((i) => time[i]),
        indices.map((i) => values[i]),
        norms,
      ),
    )
  }
  return result
}

/** Low-flow days on or before day of year `throughDoy`: the same part of every year. */
export function countThrough(days: readonly number[], throughDoy: number): number {
  return days.filter((d) => d <= throughDoy).length
}

function meanOver(
  time: readonly string[],
  values: DailyValues,
  years: YearRange,
  months?: readonly number[],
) {
  const picked = time.flatMap((date, i) => {
    const year = yearOf(date)
    const month = Number(date.slice(5, 7))
    const inRange = year >= years.from && year <= years.to
    return inRange && (!months || months.includes(month)) ? [values[i]] : []
  })
  const sample = nonNull(picked)
  return sample.length === 0 ? null : mean(sample)
}

/**
 * Change of mean discharge from `baseline` to `recent`, in whole percent, optionally over
 * some months only (1 = January). `null` when either period has no data or a zero mean.
 */
export function meanChangePct(
  time: readonly string[],
  values: DailyValues,
  baseline: YearRange,
  recent: YearRange,
  months?: readonly number[],
): number | null {
  const before = meanOver(time, values, baseline, months)
  const after = meanOver(time, values, recent, months)
  if (before === null || after === null || before <= 0) return null
  return Math.round((after / before - 1) * 100) + 0
}

export interface YearCount {
  year: number
  days: number
}

/** One station's climate indicators as the map and the station panel show them. */
export interface ClimateSummary {
  meanChangePct: number | null
  lowSeasonChangePct: number | null
  /** Low-flow days from 1 January to today; `null` until this year's discharge loads. */
  thisYear: number | null
  /** Low-flow days over the same part of each year, the current one last when known. */
  byYear: YearCount[]
  /** Mean of `byYear` over the baseline and the recent period. */
  baselineMean: number | null
  recentMean: number | null
}

function meanDays(counts: readonly YearCount[], range: YearRange): number | null {
  const days = counts.filter((c) => c.year >= range.from && c.year <= range.to).map((c) => c.days)
  return days.length === 0 ? null : mean(days)
}

/**
 * Compares this year's low-flow days with the same part (1 January to `today`) of every
 * earlier year in `climate`. `thisYearDays` are this year's low-flow days of year.
 */
export function summarizeClimate(
  climate: ClimateFile,
  stationId: string,
  thisYearDays: readonly number[] | null,
  today: string,
): ClimateSummary | null {
  const station = climate.stations[stationId]
  if (!station) return null
  const through = dayOfYear(today)
  const byYear = station.lowFlowDays.map((days, i) => ({
    year: climate.years.from + i,
    days: countThrough(days, through),
  }))
  const thisYear = thisYearDays === null ? null : countThrough(thisYearDays, through)
  const currentYear = yearOf(today)
  if (thisYear !== null && currentYear > climate.years.to) {
    byYear.push({ year: currentYear, days: thisYear })
  }
  return {
    meanChangePct: station.meanChangePct,
    lowSeasonChangePct: station.lowSeasonChangePct,
    thisYear,
    byYear,
    baselineMean: meanDays(byYear, climate.baseline),
    recentMean: meanDays(byYear, climate.recent),
  }
}
