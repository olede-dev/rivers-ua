import { useQuery } from '@tanstack/vue-query'

import { AppError, getJson } from '../api/http'
import { BORDER_PATH, RIVERS_PATH, type BorderFile, type RiversFile } from '../config/geo'

function hasType(value: unknown, type: string): boolean {
  return typeof value === 'object' && value !== null && (value as { type?: unknown }).type === type
}

async function fetchGeo<T>(path: string, type: string, signal: AbortSignal): Promise<T> {
  const url = new URL(`${import.meta.env.BASE_URL}${path}`, window.location.href)
  const body = await getJson(url, { signal })
  if (!hasType(body, type)) {
    throw new AppError({
      category: 'Internal',
      code: 'geo_invalid',
      message: `${path} is not a GeoJSON ${type}`,
    })
  }
  return body as T
}

/** Static river lines built by `npm run build:geo`; decorative, so failures stay silent. */
export function useRivers() {
  return useQuery({
    queryKey: ['geo', 'rivers'],
    queryFn: ({ signal }) => fetchGeo<RiversFile>(RIVERS_PATH, 'FeatureCollection', signal),
    staleTime: Infinity,
  })
}

/** Static Ukraine border (with Crimea) built by `npm run build:geo`. */
export function useUkraineBorder() {
  return useQuery({
    queryKey: ['geo', 'border'],
    queryFn: ({ signal }) => fetchGeo<BorderFile>(BORDER_PATH, 'Feature', signal),
    staleTime: Infinity,
  })
}
