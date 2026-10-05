import { assertDate } from '../lib/dates'
import type { Coordinates, DischargeSeries } from '../types'
import { fetchDischarge, type DischargeWindow } from './flood'
import { AppError, getJson, isRateLimited, type RequestOptions } from './http'

/** Where the discharge on screen came from. */
export type DischargeSource =
  | { kind: 'live' }
  | {
      kind: 'snapshot'
      /** Kyiv date the snapshot was downloaded, `YYYY-MM-DD`. */
      fetchedOn: string
      reason: 'rate_limited' | 'unavailable'
    }

export interface DischargeData {
  series: Map<string, DischargeSeries>
  source: DischargeSource
}

/** `public/data/discharge-snapshot.json`, written by `scripts/build-snapshot.ts`. */
export interface DischargeSnapshotFile {
  fetchedOn: string
  window: DischargeWindow
  stations: Record<string, DischargeSeries>
}

function isSeries(value: unknown): value is DischargeSeries {
  if (typeof value !== 'object' || value === null) return false
  const { time, discharge, ensemble } = value as Record<string, unknown>
  return (
    Array.isArray(time) &&
    Array.isArray(discharge) &&
    discharge.length === time.length &&
    typeof ensemble === 'object' &&
    ensemble !== null
  )
}

/** Keeps the series of every requested station; a missing station makes the whole set unusable. */
export function pickStations(
  value: unknown,
  stationIds: readonly string[],
): Map<string, DischargeSeries> | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const series = new Map<string, DischargeSeries>()
  for (const id of stationIds) {
    const entry = record[id]
    if (!isSeries(entry)) return null
    series.set(id, entry)
  }
  return series
}

async function fetchSnapshot(
  url: URL,
  stationIds: readonly string[],
  signal?: AbortSignal,
): Promise<{ fetchedOn: string; series: Map<string, DischargeSeries> }> {
  const body = await getJson(url, { signal })
  const invalid = () =>
    new AppError({
      category: 'Internal',
      code: 'snapshot_invalid',
      message: 'discharge-snapshot.json has an unexpected shape',
    })
  if (typeof body !== 'object' || body === null) throw invalid()
  const { fetchedOn, stations } = body as Record<string, unknown>
  const series = pickStations(stations, stationIds)
  if (typeof fetchedOn !== 'string' || !series) throw invalid()
  return { fetchedOn: assertDate(fetchedOn), series }
}

/**
 * Live discharge from Open-Meteo; when the API fails (rate limit, outage, bad response)
 * the static snapshot stands in, marked so the UI can say the data is not current.
 */
export async function loadDischarge(
  stations: readonly (Coordinates & { id: string })[],
  window: DischargeWindow,
  options: RequestOptions & { snapshotUrl: URL },
): Promise<DischargeData> {
  const { snapshotUrl, ...requestOptions } = options
  try {
    const series = await fetchDischarge(stations, window, requestOptions)
    return { series, source: { kind: 'live' } }
  } catch (liveError) {
    if (options.signal?.aborted) throw liveError
    if (!(liveError instanceof AppError) || liveError.category !== 'Upstream') throw liveError

    let snapshot
    try {
      snapshot = await fetchSnapshot(
        snapshotUrl,
        stations.map((s) => s.id),
        options.signal,
      )
    } catch (snapshotError) {
      // The live failure is what the user needs to hear about; a missing snapshot
      // (normal in local development) is secondary context.
      console.warn('Discharge snapshot unavailable', snapshotError)
      throw liveError
    }
    return {
      series: snapshot.series,
      source: {
        kind: 'snapshot',
        fetchedOn: snapshot.fetchedOn,
        reason: isRateLimited(liveError) ? 'rate_limited' : 'unavailable',
      },
    }
  }
}
