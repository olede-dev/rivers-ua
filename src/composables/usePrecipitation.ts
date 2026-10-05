import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

import { fetchPrecipitation } from '../api/weather'
import { PRECIPITATION_WINDOW } from '../config/discharge'
import type { Station } from '../types'

/** Request C: precipitation for the selected station only, and only while the chart shows it. */
export function usePrecipitation(
  station: MaybeRefOrGetter<Station>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery({
    queryKey: computed(() => ['precipitation', toValue(station).id, PRECIPITATION_WINDOW]),
    queryFn: ({ signal }) => fetchPrecipitation(toValue(station), PRECIPITATION_WINDOW, { signal }),
    enabled: () => toValue(enabled),
  })
}
