import {
  Marker,
  type ExpressionSpecification,
  type GeoJSONSource,
  type Map as MapLibreMap,
} from 'maplibre-gl'

import { NO_DATA_STROKE } from '../../config/anomalyClasses'
import type { StationState } from '../../types'
import type { MapMark } from './mapMarks'

const STATIONS_SOURCE = 'stations'
/** Bottom marker layer; geo layers are added under it. */
export const STATIONS_BOTTOM_LAYER = 'stations'
/** Layers the pointer can hit; the selected copy is drawn over the rest. */
export const STATION_LAYERS = ['stations', 'station-selected']

/** Marker outlines: a ring in the basemap's tone, and a contrasting one for the selection. */
const MARKER_STROKES = {
  light: { ring: '#ffffff', selected: '#0f172a' },
  dark: { ring: '#0f172a', selected: '#ffffff' },
}
/** A one-off pop when a station is selected; the keyframes live in main.css. */
const POP = { durationMs: 600 }
/** Selection outline, for the pop overlay that mirrors the selected marker. */
export function selectedStroke(dark: boolean): string {
  return (dark ? MARKER_STROKES.dark : MARKER_STROKES.light).selected
}

export function markerRadius(meanAnnual: number | null): number {
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
  const paint = {
    'circle-color': FILL,
    'circle-opacity': 0.95,
    'circle-radius': RADIUS,
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

/** A station drawn by an HTML overlay: CSS animates it without redrawing the map. */
export interface StationOverlay {
  id: string
  lngLat: [number, number]
  radius: number
  fill: string
}

/** MapLibre positions the outer box by its transform, so CSS animates the inner one. */
function overlayElement(className: string, { radius, fill }: StationOverlay): HTMLDivElement {
  const element = document.createElement('div')
  const inner = document.createElement('div')
  inner.className = className
  inner.style.setProperty('--size', `${2 * radius}px`)
  inner.style.setProperty('--fill', fill)
  element.append(inner)
  return element
}

/**
 * Pulse rings and the selection pop as CSS-animated HTML markers. Animating paint
 * properties instead restyles and redraws the whole map every frame, which stalls weak GPUs.
 */
export function createStationAnimator(map: MapLibreMap, reducedMotion: () => boolean) {
  const rings = new Map<string, { marker: Marker; key: string }>()
  let popMarker: Marker | null = null

  function clearPop() {
    popMarker?.remove()
    popMarker = null
  }

  return {
    /** Rings behind the given stations; others lose theirs. */
    setPulsing(stations: readonly StationOverlay[]) {
      const next = new Map((reducedMotion() ? [] : stations).map((s) => [s.id, s] as const))
      for (const [id, ring] of rings) {
        const station = next.get(id)
        if (station && ring.key === `${station.fill}|${station.radius}`) next.delete(id)
        else {
          ring.marker.remove()
          rings.delete(id)
        }
      }
      for (const station of next.values()) {
        const marker = new Marker({ element: overlayElement('station-pulse', station) })
          .setLngLat(station.lngLat)
          .addTo(map)
        rings.set(station.id, { marker, key: `${station.fill}|${station.radius}` })
      }
    },
    pop(station: StationOverlay, stroke: string) {
      clearPop()
      if (reducedMotion()) return
      const element = overlayElement('station-pop', station)
      const inner = element.firstElementChild as HTMLElement
      inner.style.setProperty('--stroke', stroke)
      inner.style.animationDuration = `${POP.durationMs}ms`
      inner.addEventListener('animationend', clearPop, { once: true })
      popMarker = new Marker({ element }).setLngLat(station.lngLat).addTo(map)
    },
    stop() {
      for (const ring of rings.values()) ring.marker.remove()
      rings.clear()
      clearPop()
    },
  }
}
