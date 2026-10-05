import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import { fetchDischargeHistory } from '../api/flood'
import { AppError, getJson } from '../api/http'
import { STATIONS } from '../config/stations'
import { lowFlowDays, summarizeClimate, type ClimateSummary } from '../lib/climate'
import { todayKyiv } from '../lib/dates'
import type { ClimateFile, NormsFile } from '../types'

function isClimateFile(value: unknown): value is ClimateFile {
  if (typeof value !== 'object' || value === null) return false
  const { stations, years } = value as Record<string, unknown>
  return typeof stations === 'object' && stations !== null && typeof years === 'object'
}

async function fetchClimate(signal: AbortSignal): Promise<ClimateFile> {
  const url = new URL(`${import.meta.env.BASE_URL}data/climate.json`, window.location.href)
  const body = await getJson(url, { signal })
  if (!isClimateFile(body)) {
    throw new AppError({
      category: 'Internal',
      code: 'climate_invalid',
      message: 'climate.json has an unexpected shape',
    })
  }
  return body
}

/**
 * Climate indicators of every station: the static trends and past low-flow days of
 * `npm run build:climate`, plus this year's low-flow days. This year's discharge since
 * 1 January (request D, one call for every station) loads only while `enabled` holds.
 */
export function useClimate(
  norms: MaybeRefOrGetter<NormsFile | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const today = todayKyiv()
  const climate = useQuery({
    queryKey: ['climate'],
    queryFn: ({ signal }) => fetchClimate(signal),
    staleTime: Infinity,
    enabled: () => toValue(enabled),
  })
  const thisYear = useQuery({
    queryKey: ['discharge-year', today],
    queryFn: ({ signal }) =>
      fetchDischargeHistory(
        STATIONS,
        { startDate: `${today.slice(0, 4)}-01-01`, endDate: today },
        { signal },
      ),
    staleTime: Infinity,
    enabled: () => toValue(enabled),
  })

  const summaries = computed(() => {
    const file = climate.data.value
    const normsFile = toValue(norms)
    const result = new Map<string, ClimateSummary>()
    if (!file) return result
    STATIONS.forEach((station, i) => {
      const series = thisYear.data.value?.[i]
      const stationNorms = normsFile?.stations[station.id]
      const days =
        series && stationNorms ? lowFlowDays(series.time, series.discharge, stationNorms) : null
      const summary = summarizeClimate(file, station.id, days, today)
      if (summary) result.set(station.id, summary)
    })
    return result
  })

  return { climate, thisYear, summaries }
}
