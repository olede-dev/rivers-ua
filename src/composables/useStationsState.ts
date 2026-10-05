import { computed, type Ref } from 'vue'

import { STATIONS } from '../config/stations'
import { anomalyPct, classifyDischarge } from '../lib/anomaly'
import { dayOfYear, todayKyiv } from '../lib/dates'
import type { DischargeSeries, NormsFile, Station, StationState } from '../types'
import { useDischarge } from './useDischarge'
import { useNorms } from './useNorms'

/** Observed discharge up to `today`, the ensemble median after it. */
function valueOn(series: DischargeSeries | undefined, date: string, today: string): number | null {
  if (!series) return null
  const index = series.time.indexOf(date)
  if (index === -1) return null
  return date > today
    ? (series.ensemble.median[index] ?? series.discharge[index])
    : series.discharge[index]
}

function toState(
  station: Station,
  series: DischargeSeries | undefined,
  norms: NormsFile | undefined,
  today: string,
  date: string,
): StationState {
  const current = valueOn(series, date, today)
  const stationNorms = norms?.stations[station.id]
  const norm = stationNorms?.doy[dayOfYear(date) - 1] ?? null
  return {
    station,
    cell: series?.cell ?? null,
    current,
    norm,
    meanAnnual: stationNorms?.meanAnnual ?? null,
    anomalyClass: norm ? classifyDischarge(current, norm) : null,
    anomalyPct: norm ? anomalyPct(current, norm.median) : null,
  }
}

/**
 * Joins today's discharge with the day-of-year norm for every station. `mapDate`, when given,
 * drives `mapStates` too: the same join for another day (the map timelapse).
 */
export function useStationsState(mapDate?: Ref<string>) {
  const discharge = useDischarge()
  const norms = useNorms()
  const today = todayKyiv()

  const statesOn = (date: string) =>
    STATIONS.map((station) =>
      toState(station, discharge.data.value?.series.get(station.id), norms.data.value, today, date),
    )
  const states = computed(() => statesOn(today))
  const mapStates = computed(() =>
    !mapDate || mapDate.value === today ? states.value : statesOn(mapDate.value),
  )

  return { states, mapStates, today, discharge, norms }
}
