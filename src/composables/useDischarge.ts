import { useQuery } from '@tanstack/vue-query'

import { loadDischarge, type DischargeData } from '../api/discharge'
import { DISCHARGE_MAX_AGE_MS, DISCHARGE_WINDOW, SNAPSHOT_PATH } from '../config/discharge'
import { STATIONS } from '../config/stations'
import { readCachedDischarge, writeCachedDischarge } from '../lib/dischargeCache'
import { nowMs } from '../lib/dates'

const STATION_IDS = STATIONS.map((s) => s.id)

/** `localStorage`, or `null` where the browser blocks it (private mode, disabled site data). */
function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Request A: one call for every station. A live response is kept in `localStorage` for an
 * hour so reloads cost no quota; when Open-Meteo fails, the static snapshot stands in.
 */
export function useDischarge() {
  const storage = browserStorage()
  const cached =
    storage &&
    readCachedDischarge(storage, {
      stationIds: STATION_IDS,
      window: DISCHARGE_WINDOW,
      nowMs: nowMs(),
      maxAgeMs: DISCHARGE_MAX_AGE_MS,
    })

  return useQuery({
    queryKey: ['discharge', DISCHARGE_WINDOW],
    queryFn: async ({ signal }): Promise<DischargeData> => {
      const snapshotUrl = new URL(
        `${import.meta.env.BASE_URL}${SNAPSHOT_PATH}`,
        window.location.href,
      )
      const data = await loadDischarge(STATIONS, DISCHARGE_WINDOW, { signal, snapshotUrl })
      if (storage && data.source.kind === 'live') {
        writeCachedDischarge(storage, data.series, { window: DISCHARGE_WINDOW, nowMs: nowMs() })
      }
      return data
    },
    staleTime: DISCHARGE_MAX_AGE_MS,
    initialData: cached ? { series: cached.series, source: { kind: 'live' as const } } : undefined,
    initialDataUpdatedAt: cached?.savedAtMs,
  })
}
