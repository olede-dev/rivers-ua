import { useQuery } from '@tanstack/vue-query'

import { AppError, getJson } from '../api/http'
import type { NormsFile } from '../types'

function isNormsFile(value: unknown): value is NormsFile {
  if (typeof value !== 'object' || value === null) return false
  const { stations } = value as Record<string, unknown>
  return typeof stations === 'object' && stations !== null
}

async function fetchNorms(signal: AbortSignal): Promise<NormsFile> {
  const url = new URL(`${import.meta.env.BASE_URL}data/norms.json`, window.location.href)
  const body = await getJson(url, { signal })
  if (!isNormsFile(body)) {
    throw new AppError({
      category: 'Internal',
      code: 'norms_invalid',
      message: 'norms.json has an unexpected shape',
    })
  }
  return body
}

/** Static 1997–2020 norms built by `npm run build:norms`; never stale within a session. */
export function useNorms() {
  return useQuery({
    queryKey: ['norms'],
    queryFn: ({ signal }) => fetchNorms(signal),
    staleTime: Infinity,
  })
}
