import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl'

import type { BorderFile, RiversFile } from '../../config/geo'
import type { Position } from '../../lib/geometry'
import { assignRiverReach, type SegmentReach } from '../../lib/riverReach'
import type { StationState } from '../../types'

/** Source ids; river runs promote `tintId` to the feature id, so state is set per station. */
export const RIVERS_SOURCE = 'rivers'
const BORDER_SOURCE = 'border'

/** The veil over everything outside Ukraine makes the country read as the focus. */
const GEO_COLORS = {
  light: {
    river: '#2563eb',
    border: '#7c93c3',
    halo: '#fde68a',
    haloOpacity: 0.35,
    veil: '#ffffff',
  },
  dark: { river: '#60a5fa', border: '#94a3b8', halo: '#facc15', haloOpacity: 0.2, veil: '#020617' },
}
/** Outline under the focused river reach, in the basemap's tone. */
const CASING_COLORS = { light: '#ffffff', dark: '#0f172a' }
/** Opacity factor for rivers outside the selected station's reach. */
const DIMMED = 0.3
const VEIL_OPACITY = 0.45

const geoColors = (dark: boolean) => (dark ? GEO_COLORS.dark : GEO_COLORS.light)
const WORLD_RING: Position[] = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
]

/** How far downstream and upstream a station tints its river, and how far it may sit off it. */
const REACH_KM = 120
const SNAP_KM = 4
/** Tint steps from the station outwards; the last step is closest to the plain river colour. */
const FADE_STEPS = 4

function linesOf(geometry: RiversFile['features'][number]['geometry']): Position[][] {
  return geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates
}

/**
 * Segment reach per feature, cached per river file and reach: it depends only on station
 * positions.
 */
const reachCaches = new Map<number, WeakMap<RiversFile, (SegmentReach | null)[][][]>>()
function riverReach(data: RiversFile, states: readonly StationState[], maxKm: number) {
  let cache = reachCaches.get(maxKm)
  if (!cache) reachCaches.set(maxKm, (cache = new WeakMap()))
  let reach = cache.get(data)
  if (!reach) {
    const lines = data.features.map((f) => linesOf(f.geometry))
    const flat = assignRiverReach(
      lines.flat(),
      states.map(({ station }) => ({
        id: station.id,
        position: [station.marker.lon, station.marker.lat],
      })),
      maxKm,
      SNAP_KM,
    )
    let next = 0
    reach = lines.map((featureLines) => featureLines.map(() => flat[next++]))
    cache.set(data, reach)
  }
  return reach
}

/**
 * Splits the rivers into runs that share a tinting station and a fade step. The geometry
 * depends only on station positions, so a date change in the timelapse only recolours the
 * runs (`setRiverTints`) instead of rebuilding the paths.
 */
export function riverRuns(data: RiversFile, states: readonly StationState[]): RiversFile {
  const reach = riverReach(data, states, REACH_KM)
  const propsAt = (r: SegmentReach | null) =>
    r
      ? {
          tintId: r.id,
          tintStep: Math.min(FADE_STEPS - 1, Math.floor((r.km / REACH_KM) * FADE_STEPS)),
        }
      : {}
  const features: RiversFile['features'] = []
  data.features.forEach((feature, f) => {
    linesOf(feature.geometry).forEach((line, l) => {
      const same = (p: ReturnType<typeof propsAt>, q: ReturnType<typeof propsAt>) =>
        p.tintId === q.tintId && p.tintStep === q.tintStep
      let run: Position[] = [line[0]]
      let runProps = propsAt(reach[f][l][0])
      const flush = () =>
        features.push({
          type: 'Feature',
          properties: { ...feature.properties, ...runProps },
          geometry: { type: 'LineString', coordinates: run },
        })
      for (let i = 1; i < line.length; i++) {
        const props = propsAt(reach[f][l][i - 1])
        if (!same(props, runProps)) {
          flush()
          run = [line[i - 1]]
          runProps = props
        }
        run.push(line[i])
      }
      flush()
    })
  })
  return { type: 'FeatureCollection', features }
}

const TINTED: ExpressionSpecification = ['to-boolean', ['feature-state', 'tint']]
const FOCUSED: ExpressionSpecification = ['boolean', ['feature-state', 'focused'], false]

/**
 * Stroke widths grow with zoom so rivers stay visible over the city-level basemap. Tinted
 * reaches are a little thicker so the colour reads at country zoom; the focused reach more so.
 */
function riverWidth(extra: number): ExpressionSpecification {
  const major = ['==', ['get', 'major'], true] as ExpressionSpecification
  const at = (zoom: number): ExpressionSpecification => [
    '+',
    ['case', major, 1.6 + Math.max(0, zoom - 5) * 0.6, 0.9 + Math.max(0, zoom - 5) * 0.35],
    ['case', FOCUSED, 2.5 + extra, TINTED, 1.2 + extra, extra],
  ]
  return ['interpolate', ['linear'], ['zoom'], 5, at(5), 14, at(14)]
}

/**
 * Rivers near a station take its tint, fading back to the plain river colour with network
 * distance. A `null` tint keeps the plain colour, so only notable stations stand out.
 */
function riverColor(dark: boolean): ExpressionSpecification {
  const base = geoColors(dark).river
  return [
    'case',
    TINTED,
    [
      'interpolate',
      ['linear'],
      ['coalesce', ['get', 'tintStep'], 0],
      0,
      ['to-color', ['feature-state', 'tint']],
      FADE_STEPS,
      base,
    ],
    base,
  ]
}

/** A selection dims every river outside the selected station's reach. */
export function riverOpacity(dimmed: boolean): ExpressionSpecification {
  const fade = dimmed ? DIMMED : 1
  return [
    'case',
    FOCUSED,
    1,
    TINTED,
    0.95 * fade,
    ['==', ['get', 'major'], true],
    0.85 * fade,
    0.6 * fade,
  ]
}

function outerRings(border: BorderFile): Position[][] {
  return border.geometry.coordinates.map((polygon) => polygon[0])
}

/**
 * River runs over a casing that outlines only the focused reach. Drawn under `beforeId`: the
 * border veil, or the markers while the border has not loaded.
 */
export function addRiverLayers(
  map: MapLibreMap,
  rivers: RiversFile,
  dark: boolean,
  dimmed: boolean,
  beforeId: string,
): void {
  map.addSource(RIVERS_SOURCE, { type: 'geojson', data: rivers, promoteId: 'tintId' })
  const layout = { 'line-cap': 'round', 'line-join': 'round' } as const
  map.addLayer(
    {
      id: 'river-casing',
      type: 'line',
      source: RIVERS_SOURCE,
      layout,
      paint: {
        'line-color': dark ? CASING_COLORS.dark : CASING_COLORS.light,
        'line-opacity': ['case', FOCUSED, 0.9, 0],
        'line-width': riverWidth(3.5),
      },
    },
    beforeId,
  )
  map.addLayer(
    {
      id: 'rivers',
      type: 'line',
      source: RIVERS_SOURCE,
      layout,
      paint: {
        'line-color': riverColor(dark),
        'line-opacity': riverOpacity(dimmed),
        'line-width': riverWidth(0),
      },
    },
    beforeId,
  )
}

/** First layer of the border group; rivers go under it so the veil also dims rivers abroad. */
export const BORDER_BOTTOM_LAYER = 'border-veil'

/**
 * Veil outside the country, a soft yellow halo and a blue-grey outline along the border,
 * drawn under `beforeId` (the markers).
 */
export function addBorderLayers(
  map: MapLibreMap,
  border: BorderFile,
  dark: boolean,
  beforeId: string,
): void {
  const colors = geoColors(dark)
  const rings = outerRings(border)
  map.addSource(BORDER_SOURCE, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { veil: true },
          geometry: { type: 'Polygon', coordinates: [WORLD_RING, ...rings] },
        },
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'MultiLineString', coordinates: rings },
        },
      ],
    },
  })
  map.addLayer(
    {
      id: BORDER_BOTTOM_LAYER,
      type: 'fill',
      source: BORDER_SOURCE,
      filter: ['has', 'veil'],
      paint: { 'fill-color': colors.veil, 'fill-opacity': VEIL_OPACITY },
    },
    beforeId,
  )
  const line = (id: string, color: string, width: number, opacity: number) =>
    map.addLayer(
      {
        id,
        type: 'line',
        source: BORDER_SOURCE,
        filter: ['!', ['has', 'veil']],
        layout: { 'line-join': 'round' },
        paint: { 'line-color': color, 'line-width': width, 'line-opacity': opacity },
      },
      beforeId,
    )
  line('border-halo', colors.halo, 5, colors.haloOpacity)
  line('border-line', colors.border, 1.25, 0.7)
}

/** Tint per station id; `null` keeps the plain river colour. Only feature state changes. */
export function setRiverTints(map: MapLibreMap, tints: ReadonlyMap<string, string | null>): void {
  for (const [id, tint] of tints) map.setFeatureState({ source: RIVERS_SOURCE, id }, { tint })
}

/** Widens and outlines one station's reach; `null` clears the focus. */
export function setRiverFocus(map: MapLibreMap, from: string | null, to: string | null): void {
  if (from !== null) map.setFeatureState({ source: RIVERS_SOURCE, id: from }, { focused: false })
  if (to !== null) map.setFeatureState({ source: RIVERS_SOURCE, id: to }, { focused: true })
}
