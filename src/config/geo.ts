import type { Feature, FeatureCollection, LineString, MultiLineString, MultiPolygon } from 'geojson'

/** Paths under `public/`, written by `npm run build:geo`. */
export const RIVERS_PATH = 'data/rivers.geojson'
export const BORDER_PATH = 'data/ukraine-border.geojson'

/** `major`: a Natural Earth main river line; otherwise a European supplement tributary. */
export interface RiverProperties {
  major: boolean
}

export type RiversFile = FeatureCollection<LineString | MultiLineString, RiverProperties>
export type BorderFile = Feature<MultiPolygon, Record<string, never>>
