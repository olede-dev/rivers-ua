<script setup lang="ts">
import 'leaflet/dist/leaflet.css'

import L from 'leaflet'
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { useLocale } from '../../composables/useLocale'
import { useRivers, useUkraineBorder } from '../../composables/useMapGeo'
import { useTheme } from '../../composables/useTheme'
import { NO_DATA_STROKE } from '../../config/anomalyClasses'
import { stationName, type Locale } from '../../i18n'
import { formatDischarge } from '../../lib/format'
import { useUiStore } from '../../stores/ui'
import type { StationState } from '../../types'
import { addBasemap } from './basemap'
import {
  BORDER_PANE,
  createBorderLayer,
  createGeoPanes,
  createRiversLayer,
  flowSignature,
  RIVERS_PANE,
  styleRivers,
} from './geoLayers'
import { createMapLegend, type MapLegend } from './MapLegend'
import { UNCLASSIFIED_FILL, type LegendContent, type MapMark } from './mapMarks'

const props = defineProps<{
  states: readonly StationState[]
  /** How each station looks in the current layer, by station id. */
  marks: ReadonlyMap<string, MapMark>
  legend: LegendContent
  /** Markers appear only once discharge has loaded or failed. */
  showMarkers: boolean
}>()

const UKRAINE_BOUNDS: L.LatLngBoundsExpression = [
  [44.0, 22.0],
  [52.5, 40.3],
]
const SELECTED_ZOOM = 8
/** Marker outlines: a ring in the basemap's tone, and a contrasting one for the selection. */
const MARKER_STROKES = {
  light: { ring: '#ffffff', selected: '#0f172a' },
  dark: { ring: '#0f172a', selected: '#ffffff' },
}

const ui = useUiStore()
const rivers = useRivers()
const border = useUkraineBorder()
const { isDark } = useTheme()
const { locale, t } = useLocale()
const container = useTemplateRef<HTMLDivElement>('container')

// Leaflet objects stay outside Vue reactivity: proxies break them.
let map: L.Map | undefined
let resizeObserver: ResizeObserver | undefined
/** Set once the user pans or zooms; until then a resize restores the initial view. */
let viewTouched = false
const markers = new Map<string, L.CircleMarker>()
/** Expanding rings behind strongly anomalous stations; see `.marker-pulse` in main.css. */
const pulses = new Map<string, L.CircleMarker>()
let riversLayer: L.FeatureGroup | undefined
/** Flow speeds the river paths were built with; other state changes only restyle them. */
let riversFlow: string | undefined
let borderLayer: L.LayerGroup | undefined
let setBasemapStyle: ((dark: boolean, locale: Locale) => void) | undefined
let legendControl: MapLegend | undefined

/**
 * Leaflet's SVG renderer only CSS-scales its layer on each `zoom` event and redraws on
 * `moveend`, so during `flyTo` circle markers balloon by 2^Δzoom. Redraw every frame instead;
 * the CSS zoom animation (`_animatingZoom`) keeps the stock behaviour.
 */
type SvgInternals = L.SVG & {
  _map: L.Map & { _animatingZoom?: boolean }
  _onZoom(): void
  _reset(): void
}
const FixedSizeSvg = L.SVG.extend({
  _onZoom(this: SvgInternals) {
    if (this._map._animatingZoom) (L.SVG.prototype as SvgInternals)._onZoom.call(this)
    else this._reset()
  },
}) as unknown as new (options?: L.RendererOptions) => L.SVG

function markerRadius(meanAnnual: number | null): number {
  if (meanAnnual === null || meanAnnual <= 0) return 8
  return Math.min(16, Math.max(6, 5 + 2.5 * Math.log10(meanAnnual)))
}

function markOf(id: string): MapMark {
  return props.marks.get(id) ?? { fill: UNCLASSIFIED_FILL, tint: null, pulse: false, detail: null }
}

function markerStyle(mark: MapMark, selected: boolean): L.CircleMarkerOptions {
  const color = mark.fill
  const strokes = isDark.value ? MARKER_STROKES.dark : MARKER_STROKES.light
  const base = color
    ? { fillColor: color, fillOpacity: 0.95, color: strokes.ring, weight: 1.5 }
    : { fillOpacity: 0, color: NO_DATA_STROKE, weight: 2 }
  return selected ? { ...base, color: strokes.selected, weight: 3 } : base
}

function tooltipText({ station, current }: StationState, mark: MapMark): string {
  const { river, place } = stationName(station, locale.value)
  const parts = [
    `${river} — ${place}`,
    `${formatDischarge(current, locale.value)} ${t.value.dischargeUnit}`,
  ]
  if (mark.detail !== null) parts.push(mark.detail)
  return parts.join(' · ')
}

function syncPulse(state: StationState, mark: MapMark, visible: boolean) {
  const { id, marker: position } = state.station
  const color = mark.fill
  let pulse = pulses.get(id)
  if (!mark.pulse || color === null || !visible) {
    pulse?.remove()
    return
  }
  if (!pulse) {
    pulse = L.circleMarker([position.lat, position.lon], {
      className: 'marker-pulse',
      interactive: false,
      fill: false,
    })
    pulses.set(id, pulse)
  }
  pulse.setStyle({ color, weight: 2.5, opacity: 0.9 })
  pulse.setRadius(markerRadius(state.meanAnnual))
  if (map && !map.hasLayer(pulse)) pulse.addTo(map).bringToBack()
}

function syncMarkers() {
  if (!map || !props.showMarkers) return
  for (const state of props.states) {
    const { id, marker: position, basin } = state.station
    let marker = markers.get(id)
    if (!marker) {
      marker = L.circleMarker([position.lat, position.lon]).bindTooltip('', { direction: 'top' })
      marker.on('click', () => ui.selectStation(id))
      markers.set(id, marker)
    }
    const selected = ui.selectedId === id
    const mark = markOf(id)
    marker.setStyle(markerStyle(mark, selected))
    marker.setRadius(markerRadius(state.meanAnnual))
    marker.setTooltipContent(tooltipText(state, mark))

    const visible = ui.basin === 'all' || basin === ui.basin
    if (visible && !map.hasLayer(marker)) marker.addTo(map)
    if (!visible && map.hasLayer(marker)) marker.remove()
    if (visible && selected) marker.bringToFront()
    syncPulse(state, mark, visible)
  }
}

/** No tints until markers show, so rivers do not flash colours before data arrives. */
function riverTints(): Map<string, string | null> {
  if (!props.showMarkers) return new Map()
  return new Map([...props.marks].map(([id, mark]) => [id, mark.tint]))
}

function syncGeoLayers() {
  if (!map) return
  const states = props.showMarkers ? props.states : []
  const flow = `${states.length}:${flowSignature(states)}`
  if (riversLayer && riversFlow !== flow) {
    riversLayer.remove()
    riversLayer = undefined
  }
  if (!riversLayer && rivers.data.value) {
    riversFlow = flow
    riversLayer = createRiversLayer(
      rivers.data.value,
      states,
      new FixedSizeSvg({ pane: RIVERS_PANE }),
      isDark.value,
    )
    riversLayer.addTo(map)
  }
  if (riversLayer) styleRivers(riversLayer, riverTints(), map.getZoom(), isDark.value)
  if (!borderLayer && border.data.value) {
    borderLayer = createBorderLayer(
      border.data.value,
      new FixedSizeSvg({ pane: BORDER_PANE }),
      isDark.value,
    )
    borderLayer.addTo(map)
  }
}

/** Basemap style and geo layer colours follow the theme; markers restyle in `syncMarkers`. */
function applyTheme(dark: boolean) {
  setBasemapStyle?.(dark, locale.value)
  riversLayer?.remove()
  borderLayer?.remove()
  riversLayer = undefined
  borderLayer = undefined
  syncGeoLayers()
  syncMarkers()
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function selectedPosition(id: string | null): L.LatLngTuple | null {
  const station = props.states.find((s) => s.station.id === id)?.station
  return station ? [station.marker.lat, station.marker.lon] : null
}

function focusSelection(id: string | null) {
  if (!map) return
  const animate = !prefersReducedMotion()
  const position = selectedPosition(id)
  if (position) map.flyTo(position, SELECTED_ZOOM, { animate })
  else map.flyToBounds(UKRAINE_BOUNDS, { animate })
}

/** Instant view for the current selection; a station may already be selected from the URL. */
function resetView() {
  if (!map) return
  const position = selectedPosition(ui.selectedId)
  if (position) map.setView(position, SELECTED_ZOOM, { animate: false })
  else map.fitBounds(UKRAINE_BOUNDS, { animate: false })
}

onMounted(() => {
  if (!container.value) return
  map = L.map(container.value, { minZoom: 4, zoomSnap: 0.25, renderer: new FixedSizeSvg() })
  setBasemapStyle = addBasemap(map, isDark.value, locale.value)
  createGeoPanes(map)
  resetView()
  map.on('zoomend', () => {
    if (map && riversLayer) {
      styleRivers(riversLayer, riverTints(), map.getZoom(), isDark.value)
    }
  })
  legendControl = createMapLegend(props.legend)
  legendControl.control.addTo(map)

  // A container measured while hidden or mid-layout gives a wrong initial view; reset it on resize.
  const markTouched = () => (viewTouched = true)
  for (const type of ['pointerdown', 'wheel', 'keydown'] as const) {
    container.value.addEventListener(type, markTouched, { once: true, passive: true })
  }
  resizeObserver = new ResizeObserver(() => {
    if (!map) return
    map.invalidateSize()
    if (!viewTouched) resetView()
  })
  resizeObserver.observe(container.value)
  syncMarkers()
  syncGeoLayers()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  map?.remove()
  map = undefined
  markers.clear()
  pulses.clear()
  riversLayer = undefined
  borderLayer = undefined
  setBasemapStyle = undefined
  legendControl = undefined
})

watch(
  () => [props.states, props.marks, props.showMarkers, ui.basin, ui.selectedId, locale.value],
  syncMarkers,
)
watch(() => ui.selectedId, focusSelection)
watch(
  () => [rivers.data.value, border.data.value, props.states, props.marks, props.showMarkers],
  syncGeoLayers,
)
watch(isDark, applyTheme)
watch(locale, (value) => setBasemapStyle?.(isDark.value, value))
watch(
  () => props.legend,
  (content) => legendControl?.setContent(content),
)
</script>

<template>
  <div ref="container" class="size-full" role="region" :aria-label="t.map.ariaLabel"></div>
</template>
