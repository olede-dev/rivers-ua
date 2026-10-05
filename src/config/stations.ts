import type { Station } from '../types'
import generated from './stations.generated.json'
import { STATION_SEEDS } from './station-seeds'

type ValidatedCoordinates = { lat: number; lon: number; inExpectedRange: boolean }
const validated: Record<string, ValidatedCoordinates | undefined> = generated.stations

/** Stations with coordinates refined by `npm run validate:stations`. */
export const STATIONS: readonly Station[] = STATION_SEEDS.map((seed) => {
  const coordinates = validated[seed.id]
  if (!coordinates?.inExpectedRange) {
    throw new Error(
      `Station ${seed.id} has no validated coordinates; run npm run validate:stations`,
    )
  }
  const { id, river, place, en, basin, focus, marker } = seed
  return { id, river, place, en, basin, focus, marker, lat: coordinates.lat, lon: coordinates.lon }
})
