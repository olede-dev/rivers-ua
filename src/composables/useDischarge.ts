import { useQuery } from '@tanstack/vue-query'

import { fetchDischarge } from '../api/flood'
import { STATIONS } from '../config/stations'

/** Past window for the chart's longest period plus the full 7-month ensemble forecast. */
const DISCHARGE_WINDOW = { pastDays: 60, forecastDays: 210 }

/** Request A: one call for every station, cached for the global staleTime (1 h). */
export function useDischarge() {
  return useQuery({
    queryKey: ['discharge', DISCHARGE_WINDOW],
    queryFn: ({ signal }) => fetchDischarge(STATIONS, DISCHARGE_WINDOW, { signal }),
  })
}
