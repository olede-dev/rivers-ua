import type { PrecipitationSeries } from '../api/weather'
import type { DailyValues, DischargeSeries, StationNorms } from '../types'
import { addDays, dayOfYear } from './dates'
import { nonNull, roundTo } from './stats'

export interface ChartWindow {
  /** Today in Kyiv; the past line ends here and the forecast starts here. */
  today: string
  pastDays: number
  forecastDays: number
  /** Express every value as percent of the median norm for its day of year. */
  relative: boolean
}

/** Chart-ready columns aligned by index with `time`; values are m³/s or % of norm. */
export interface ChartSeries {
  time: string[]
  past: DailyValues
  forecast: {
    median: DailyValues
    min: DailyValues
    max: DailyValues
    p25: DailyValues
    p75: DailyValues
  }
  /** `null` when norms are unavailable. */
  norm: { median: DailyValues; p25: DailyValues; p75: DailyValues } | null
  /** mm per day, never scaled to the norm; `null` when precipitation is not shown. */
  precipitation: DailyValues | null
}

function toPercent(value: number | null, median: number | null): number | null {
  if (value === null || median === null || median <= 0) return null
  return roundTo((value / median) * 100, 1)
}

/**
 * Cuts a station's discharge to `[today − pastDays, today + forecastDays]` and splits it into
 * the past line (up to today) and the ensemble forecast (from today), plus the norm per date.
 * In relative mode every value, norm bounds included, is divided by that date's median norm.
 * Precipitation is matched by date; days it does not cover (beyond its 16-day forecast) stay empty.
 */
export function buildChartSeries(
  series: DischargeSeries,
  norms: StationNorms | null,
  window: ChartWindow,
  precipitation: PrecipitationSeries | null = null,
): ChartSeries {
  const from = addDays(window.today, -window.pastDays)
  const to = addDays(window.today, window.forecastDays)
  const indices = series.time.flatMap((date, i) => (date >= from && date <= to ? [i] : []))
  const time = indices.map((i) => series.time[i])
  const normDays = norms ? time.map((date) => norms.doy[dayOfYear(date) - 1]) : null
  const medians = normDays?.map((day) => day.median) ?? null

  const scale = (values: DailyValues): DailyValues =>
    window.relative ? values.map((v, k) => toPercent(v, medians?.[k] ?? null)) : values
  const pick = (values: DailyValues, keep: (date: string) => boolean): DailyValues =>
    scale(indices.map((i) => (keep(series.time[i]) ? values[i] : null)))
  const isPast = (date: string) => date <= window.today
  const isForecast = (date: string) => date >= window.today
  const { ensemble } = series

  return {
    time,
    past: pick(series.discharge, isPast),
    forecast: {
      median: pick(ensemble.median, isForecast),
      min: pick(ensemble.min, isForecast),
      max: pick(ensemble.max, isForecast),
      p25: pick(ensemble.p25, isForecast),
      p75: pick(ensemble.p75, isForecast),
    },
    norm: normDays && {
      median: scale(normDays.map((day) => day.median)),
      p25: scale(normDays.map((day) => day.p25)),
      p75: scale(normDays.map((day) => day.p75)),
    },
    precipitation:
      precipitation && alignByDate(time, precipitation.time, precipitation.precipitation),
  }
}

function alignByDate(time: string[], sourceTime: string[], values: DailyValues): DailyValues {
  const byDate = new Map(sourceTime.map((date, i) => [date, values[i]]))
  return time.map((date) => byDate.get(date) ?? null)
}

/** Headroom above the core series before the min–max band is cut at the top edge. */
const CORE_HEADROOM = 1.5

function niceCeil(value: number): number {
  const step = 10 ** Math.floor(Math.log10(value)) / 2
  return Math.ceil(value / step) * step
}

/**
 * Upper bound for the value axis, or `null` to let it fit everything. Single ensemble members
 * can run to many times the median; letting them set the scale flattens the past line, the
 * forecast median and the norm, so the axis follows those and the min–max band is clipped.
 */
export function valueAxisMax(series: ChartSeries): number | null {
  const maxOf = (columns: DailyValues[]) =>
    Math.max(0, ...columns.flatMap((values) => nonNull(values)))
  const core = maxOf([
    series.past,
    series.forecast.median,
    series.forecast.p75,
    series.norm?.p75 ?? [],
  ])
  if (core <= 0) return null
  const limit = core * CORE_HEADROOM
  return maxOf([series.forecast.max]) > limit ? niceCeil(limit) : null
}
