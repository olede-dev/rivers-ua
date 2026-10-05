import { computed } from 'vue'

import { STATIONS } from '../config/stations'
import { anomalyPct, classifyDischarge } from '../lib/anomaly'
import { dayOfYear, todayKyiv } from '../lib/dates'
import type { DischargeSeries, NormsFile, Station, StationState } from '../types'
import { useDischarge } from './useDischarge'
import { useNorms } from './useNorms'

function valueOn(series: DischargeSeries | undefined, date: string): number | null {
  if (!series) return null
  const index = series.time.indexOf(date)
  return index === -1 ? null : series.discharge[index]
}

function toState(
  station: Station,
  series: DischargeSeries | undefined,
  norms: NormsFile | undefined,
  today: string,
): StationState {
  const current = valueOn(series, today)
  const stationNorms = norms?.stations[station.id]
  const norm = stationNorms?.doy[dayOfYear(today) - 1] ?? null
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

/** Joins today's discharge with the day-of-year norm for every station. */
export function useStationsState() {
  const discharge = useDischarge()
  const norms = useNorms()
  const today = todayKyiv()

  const states = computed(() =>
    STATIONS.map((station) =>
      toState(station, discharge.data.value?.series.get(station.id), norms.data.value, today),
    ),
  )

  return { states, today, discharge, norms }
}
