import type { BasinId } from '../types'

export type BasinFilterValue = BasinId | 'all'
/** Forecast horizon of the chart, in days. */
export type ChartRange = 30 | 90 | 210
export type ChartMode = 'abs' | 'pct'

/** The part of the UI state that is shared through the URL. */
export interface UrlState {
  station: string | null
  basin: BasinFilterValue
  range: ChartRange
  mode: ChartMode
  precip: boolean
}

export const DEFAULT_URL_STATE: Readonly<UrlState> = {
  station: null,
  basin: 'all',
  range: 90,
  mode: 'abs',
  precip: false,
}

const RANGES: readonly ChartRange[] = [30, 90, 210]
const MODES: readonly ChartMode[] = ['abs', 'pct']

/** Query values as vue-router exposes them: repeated keys become arrays. */
export type QueryInput = Record<string, string | null | (string | null)[] | undefined>

function first(value: QueryInput[string]): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null
}

function pick<T extends string | number>(raw: string | null, allowed: readonly T[], fallback: T) {
  return allowed.find((option) => String(option) === raw) ?? fallback
}

/** Reads the shared state from a route query; unknown or malformed values fall back to defaults. */
export function parseUrlState(
  query: QueryInput,
  known: { stationIds: readonly string[]; basinIds: readonly BasinId[] },
): UrlState {
  const station = first(query.station)
  return {
    station: station !== null && known.stationIds.includes(station) ? station : null,
    basin: pick<BasinFilterValue>(first(query.basin), ['all', ...known.basinIds], 'all'),
    range: pick(first(query.range), RANGES, DEFAULT_URL_STATE.range),
    mode: pick(first(query.mode), MODES, DEFAULT_URL_STATE.mode),
    precip: first(query.precip) === '1',
  }
}

/** Builds the route query for a state, omitting defaults so the plain URL stays clean. */
export function toUrlQuery(state: UrlState): Record<string, string> {
  const query: Record<string, string> = {}
  if (state.station !== null) query.station = state.station
  if (state.basin !== DEFAULT_URL_STATE.basin) query.basin = state.basin
  if (state.range !== DEFAULT_URL_STATE.range) query.range = String(state.range)
  if (state.mode !== DEFAULT_URL_STATE.mode) query.mode = state.mode
  if (state.precip) query.precip = '1'
  return query
}
