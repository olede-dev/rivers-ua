import type { Feature, FeatureCollection, LineString, MultiLineString, MultiPolygon } from 'geojson'

/** Paths under `public/`, written by `npm run build:geo`. */
export const RIVERS_PATH = 'data/rivers.geojson'
export const BORDER_PATH = 'data/ukraine-border.geojson'
export const HIDDEN_LABELS_PATH = 'data/hidden-labels.geojson'

/** `major`: a Natural Earth main river line; otherwise a European supplement tributary. */
export interface RiverProperties {
  major: boolean
  /** Station whose water state tints this run, and the fade step away from it. */
  tintId?: string
  tintStep?: number
}

export type RiversFile = FeatureCollection<LineString | MultiLineString, RiverProperties>
export type BorderFile = Feature<MultiPolygon, Record<string, never>>
/** Countries whose basemap labels (places, roads, water, countries) are not shown. */
export type HiddenLabelsFile = Feature<MultiPolygon, Record<string, never>>
