import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'

import { NO_DATA_STROKE } from '../../config/anomalyClasses'
import type { StationState } from '../../types'
import type { MapMark } from './mapMarks'

const STATIONS_SOURCE = 'stations'
/** Bottom marker layer; geo layers are added under it. */
export const STATIONS_BOTTOM_LAYER = 'station-pulse'
/** Layers the pointer can hit; the selected copy is drawn over the rest. */
export const STATION_LAYERS = ['stations', 'station-selected']

/** Marker outlines: a ring in the basemap's tone, and a contrasting one for the selection. */
const MARKER_STROKES = {
  light: { ring: '#ffffff', selected: '#0f172a' },
  dark: { ring: '#0f172a', selected: '#ffffff' },
}
/** Strongly anomalous stations: a ring that grows and fades behind the marker. */
const PULSE = { periodMs: 2200, maxScale: 2.8, opacity: 0.9 }
/** A one-off pop when a station is selected: it peaks at 40% of the duration. */
const POP = { durationMs: 600, peak: 0.4, scale: 1.6 }

function markerRadius(meanAnnual: number | null): number {
  if (meanAnnual === null || meanAnnual <= 0) return 8
  return Math.min(16, Math.max(6, 5 + 2.5 * Math.log10(meanAnnual)))
}

export function stationFeatures(
  states: readonly StationState[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: states.map(({ station, meanAnnual }) => ({
      type: 'Feature',
      properties: { id: station.id, basin: station.basin, radius: markerRadius(meanAnnual) },
      geometry: { type: 'Point', coordinates: [station.marker.lon, station.marker.lat] },
    })),
  }
}

const HAS_FILL: ExpressionSpecification = ['to-boolean', ['feature-state', 'fill']]
const FILL: ExpressionSpecification = [
  'to-color',
  ['coalesce', ['feature-state', 'fill'], 'rgba(0,0,0,0)'],
]
const RADIUS: ExpressionSpecification = ['get', 'radius']

export function addStationLayers(
  map: MapLibreMap,
  data: GeoJSON.FeatureCollection<GeoJSON.Point>,
  dark: boolean,
): void {
  const strokes = dark ? MARKER_STROKES.dark : MARKER_STROKES.light
  map.addSource(STATIONS_SOURCE, { type: 'geojson', data, promoteId: 'id' })
  map.addLayer({
    id: STATIONS_BOTTOM_LAYER,
    type: 'circle',
    source: STATIONS_SOURCE,
    paint: {
      'circle-color': 'rgba(0,0,0,0)',
      'circle-stroke-color': FILL,
      'circle-stroke-width': 2.5,
      'circle-stroke-opacity': 0,
      'circle-radius': RADIUS,
      'circle-radius-transition': { duration: 0 },
      'circle-stroke-opacity-transition': { duration: 0 },
    },
  })
  const paint = {
    'circle-color': FILL,
    'circle-opacity': 0.95,
    'circle-radius': RADIUS,
    'circle-radius-transition': { duration: 0 },
  }
  map.addLayer({
    id: 'stations',
    type: 'circle',
    source: STATIONS_SOURCE,
    paint: {
      ...paint,
      'circle-stroke-color': ['case', HAS_FILL, strokes.ring, NO_DATA_STROKE],
      'circle-stroke-width': ['case', HAS_FILL, 1.5, 2],
    },
  })
  map.addLayer({
    id: 'station-selected',
    type: 'circle',
    source: STATIONS_SOURCE,
    filter: ['==', ['get', 'id'], ''],
    paint: { ...paint, 'circle-stroke-color': strokes.selected, 'circle-stroke-width': 3 },
  })
}

export function setStationData(
  map: MapLibreMap,
  data: GeoJSON.FeatureCollection<GeoJSON.Point>,
): void {
  map.getSource<GeoJSONSource>(STATIONS_SOURCE)?.setData(data)
}

/** Fill and pulse per station id; only feature state changes. */
export function setStationMarks(map: MapLibreMap, marks: ReadonlyMap<string, MapMark>): void {
  for (const [id, mark] of marks) {
    map.setFeatureState(
      { source: STATIONS_SOURCE, id },
      { fill: mark.fill, pulse: mark.pulse && mark.fill !== null },
    )
  }
}

/** Shows one basin (or all) and draws the selected station over the others. */
export function setStationFilters(
  map: MapLibreMap,
  basin: string,
  selectedId: string | null,
): void {
  const inBasin: ExpressionSpecification =
    basin === 'all' ? ['literal', true] : ['==', ['get', 'basin'], basin]
  map.setFilter('stations', inBasin)
  map.setFilter(STATIONS_BOTTOM_LAYER, inBasin)
  map.setFilter('station-selected', ['all', inBasin, ['==', ['get', 'id'], selectedId ?? '']])
}

/**
 * Drives the pulse rings and the selection pop frame by frame through paint properties.
 * Frames run only while a pulse or a pop is visible, and never under reduced motion.
 */
export function createStationAnimator(map: MapLibreMap, reducedMotion: () => boolean) {
  let frame = 0
  let pulsing = false
  let popStart: number | null = null

  function pulseAt(now: number) {
    const t = (now % PULSE.periodMs) / PULSE.periodMs
    const eased = 1 - (1 - t) ** 2
    map.setPaintProperty('station-pulse', 'circle-radius', [
      '*',
      RADIUS,
      1 + (PULSE.maxScale - 1) * eased,
    ])
    map.setPaintProperty('station-pulse', 'circle-stroke-opacity', [
      'case',
      ['boolean', ['feature-state', 'pulse'], false],
      PULSE.opacity * (1 - eased),
      0,
    ])
  }

  function popAt(now: number): boolean {
    if (popStart === null) return false
    const t = Math.min(1, (now - popStart) / POP.durationMs)
    const up = t < POP.peak ? t / POP.peak : 1 - (t - POP.peak) / (1 - POP.peak)
    const scale = 1 + (POP.scale - 1) * (1 - (1 - up) ** 2)
    map.setPaintProperty('station-selected', 'circle-radius', ['*', RADIUS, scale])
    if (t < 1) return true
    popStart = null
    return false
  }

  function tick(now: number) {
    frame = 0
    if (!map.getLayer('stations')) return
    const popping = popAt(now)
    if (pulsing) pulseAt(now)
    if (pulsing || popping) frame = requestAnimationFrame(tick)
  }

  function run() {
    if (frame === 0) frame = requestAnimationFrame(tick)
  }

  return {
    /** Whether any visible station pulses; hides the rings when none does. */
    setPulsing(value: boolean) {
      pulsing = value && !reducedMotion()
      if (pulsing) run()
      else if (map.getLayer('station-pulse')) {
        map.setPaintProperty('station-pulse', 'circle-stroke-opacity', 0)
      }
    },
    pop() {
      if (reducedMotion()) return
      popStart = performance.now()
      run()
    },
    stop() {
      cancelAnimationFrame(frame)
      frame = 0
    },
  }
}
