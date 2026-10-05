<script setup lang="ts">
import * as maplibregl from 'maplibre-gl'
import {
  type GeoJSONSource,
  type LngLatBoundsLike,
  type LngLatLike,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl'
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { useLocale } from '../../composables/useLocale'
import { useRivers, useUkraineBorder } from '../../composables/useMapGeo'
import { useTheme } from '../../composables/useTheme'
import { stationName } from '../../i18n'
import { formatDischarge } from '../../lib/format'
import { useUiStore } from '../../stores/ui'
import type { StationState } from '../../types'
import { basemapStyle, type BasemapKind } from './basemap'
import {
  addBorderLayers,
  addRiverLayers,
  BORDER_BOTTOM_LAYER,
  RIVERS_SOURCE,
  riverOpacity,
  riverRuns,
  setRiverFocus,
  setRiverTints,
} from './geoLayers'
import MapLegend from './MapLegend.vue'
import { UNCLASSIFIED_FILL, type LegendContent, type MapMark } from './mapMarks'
import {
  addStationLayers,
  createStationAnimator,
  setStationData,
  setStationFilters,
  markerRadius,
  selectedStroke,
  setStationMarks,
  STATION_LAYERS,
  type StationOverlay,
  stationFeatures,
  STATIONS_BOTTOM_LAYER,
} from './stationLayers'

const props = defineProps<{
  states: readonly StationState[]
  /** How each station looks in the current layer, by station id. */
  marks: ReadonlyMap<string, MapMark>
  legend: LegendContent
  /** Markers appear only once discharge has loaded or failed. */
  showMarkers: boolean
}>()
const emit = defineEmits<{ basemap: [kind: BasemapKind] }>()

const UKRAINE_BOUNDS: LngLatBoundsLike = [
  [22.0, 44.0],
  [40.3, 52.5],
]
const SELECTED_ZOOM = 7
/** Shown until the basemap style arrives, so geo layers can be added straight away. */
const EMPTY_STYLE: StyleSpecification = { version: 8, sources: {}, layers: [] }

const ui = useUiStore()
const rivers = useRivers()
const border = useUkraineBorder()
const { isDark } = useTheme()
const { locale, t } = useLocale()
const container = useTemplateRef<HTMLDivElement>('container')

// MapLibre objects stay outside Vue reactivity: proxies break them.
let map: maplibregl.Map | undefined
let resizeObserver: ResizeObserver | undefined
let animator: ReturnType<typeof createStationAnimator> | undefined
/** Set once the user pans or zooms; until then a resize restores the initial view. */
let viewTouched = false
/** Station count the river runs were built for; other state changes only update feature state. */
let riversStations: number | undefined
/** Station under the pointer; its river reach is outlined until the pointer leaves. */
let hoveredId: string | null = null
/** Station whose river reach is focused in the current style. */
let focusedId: string | null = null
/** Latest basemap request; an older style that arrives late is dropped. */
let styleRequest = 0
/** Between `style.load` and the next `setStyle`, layers can be added. */
let styleReady = false
const popup = new maplibregl.Popup({
  closeButton: false,
  closeOnClick: false,
  offset: 10,
  className: 'station-tooltip',
})

function markOf(id: string): MapMark {
  return props.marks.get(id) ?? { fill: UNCLASSIFIED_FILL, tint: null, pulse: false, detail: null }
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

/** Our layers exist only after `style.load`; every style switch removes them. */
function layersReady(): boolean {
  return map?.getLayer('stations') !== undefined
}

function riversReady(): boolean {
  return map?.getLayer('rivers') !== undefined
}

function visibleStates(): readonly StationState[] {
  return props.states.filter((s) => ui.basin === 'all' || s.station.basin === ui.basin)
}

function syncTooltip() {
  const state = props.states.find((s) => s.station.id === hoveredId)
  if (!map || !state) {
    popup.remove()
    return
  }
  popup
    .setLngLat([state.station.marker.lon, state.station.marker.lat])
    .setText(tooltipText(state, markOf(state.station.id)))
  if (!popup.isOpen()) popup.addTo(map)
}

function overlayOf({ station, meanAnnual }: StationState): StationOverlay | null {
  const fill = markOf(station.id).fill
  if (fill === null) return null
  return {
    id: station.id,
    lngLat: [station.marker.lon, station.marker.lat],
    radius: markerRadius(meanAnnual),
    fill,
  }
}

/** Station data and marks; reloads the source only when the stations themselves change. */
function syncMarkers() {
  if (!map || !layersReady()) return
  const states = props.showMarkers ? props.states : []
  setStationData(map, stationFeatures(states))
  setStationMarks(map, props.showMarkers ? props.marks : new Map())
  syncFilters()
}

/** Basin and selection only filter layers and pick the pulsing rings. */
function syncFilters() {
  if (!map || !layersReady()) return
  setStationFilters(map, ui.basin, ui.selectedId)
  const pulsing = props.showMarkers ? visibleStates().filter((s) => markOf(s.station.id).pulse) : []
  animator?.setPulsing(pulsing.map(overlayOf).filter((o) => o !== null))
  syncTooltip()
}

function popSelected(id: string) {
  const state = props.states.find((s) => s.station.id === id)
  const overlay = state && props.showMarkers ? overlayOf(state) : null
  if (overlay) animator?.pop(overlay, selectedStroke(isDark.value))
}

/** No tints until markers show, so rivers do not flash colours before data arrives. */
function riverTints(): Map<string, string | null> {
  if (!props.showMarkers) return new Map()
  return new Map([...props.marks].map(([id, mark]) => [id, mark.tint]))
}

/** A selection outlines its reach and dims the rest; a hover only outlines. */
function syncRiverFocus() {
  if (!map || !riversReady()) return
  const next = ui.selectedId ?? hoveredId
  if (next !== focusedId) setRiverFocus(map, focusedId, next)
  focusedId = next
  map.setPaintProperty('rivers', 'line-opacity', riverOpacity(ui.selectedId !== null))
}

function syncRivers() {
  if (!map || !riversReady() || !rivers.data.value) return
  const states = props.showMarkers ? props.states : []
  if (riversStations !== states.length) {
    riversStations = states.length
    const runs = states.length > 0 ? riverRuns(rivers.data.value, states) : rivers.data.value
    map.getSource<GeoJSONSource>(RIVERS_SOURCE)?.setData(runs)
  }
  setRiverTints(map, riverTints())
}

/**
 * Adds whatever of markers, border and rivers the style still lacks, in drawing order: the
 * veil lies over the rivers and under the markers. Feature state starts empty with each new
 * layer, so it is set again.
 */
function addOwnLayers() {
  if (!map || !styleReady) return
  if (!layersReady()) {
    addStationLayers(map, stationFeatures([]), isDark.value)
    syncMarkers()
  }
  if (border.data.value && !map.getLayer(BORDER_BOTTOM_LAYER)) {
    addBorderLayers(map, border.data.value, isDark.value, STATIONS_BOTTOM_LAYER)
  }
  if (rivers.data.value && !riversReady()) {
    const beforeId = map.getLayer(BORDER_BOTTOM_LAYER) ? BORDER_BOTTOM_LAYER : STATIONS_BOTTOM_LAYER
    addRiverLayers(map, rivers.data.value, isDark.value, ui.selectedId !== null, beforeId)
    riversStations = undefined
    focusedId = null
    syncRivers()
    syncRiverFocus()
  }
}

/** Basemap for the theme and label language; `style.load` then brings our layers back. */
function applyStyle() {
  const own = ++styleRequest
  void basemapStyle(isDark.value, locale.value).then(({ style, kind }) => {
    if (!map || own !== styleRequest) return
    styleReady = false
    map.setStyle(style, { diff: false })
    emit('basemap', kind)
  })
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function selectedPosition(id: string | null): LngLatLike | null {
  const station = props.states.find((s) => s.station.id === id)?.station
  return station ? [station.marker.lon, station.marker.lat] : null
}

function focusSelection(id: string | null) {
  if (!map) return
  // Opening or closing the panel resizes the container in the same tick; measure it first.
  map.resize()
  const animate = !prefersReducedMotion()
  const position = selectedPosition(id)
  if (position) map.flyTo({ center: position, zoom: SELECTED_ZOOM, animate })
  else map.fitBounds(UKRAINE_BOUNDS, { animate })
}

/** Instant view for the current selection; a station may already be selected from the URL. */
function resetView() {
  if (!map) return
  const position = selectedPosition(ui.selectedId)
  if (position) map.jumpTo({ center: position, zoom: SELECTED_ZOOM })
  else map.fitBounds(UKRAINE_BOUNDS, { animate: false })
}

function stationAt(event: MapLayerMouseEvent): string | null {
  const id = event.features?.[0]?.properties.id
  return typeof id === 'string' ? id : null
}

function setHovered(id: string | null) {
  if (!map || hoveredId === id) return
  hoveredId = id
  map.getCanvas().style.cursor = id === null ? '' : 'pointer'
  syncRiverFocus()
  syncTooltip()
}

onMounted(() => {
  if (!container.value) return
  map = new maplibregl.Map({
    container: container.value,
    style: EMPTY_STYLE,
    bounds: UKRAINE_BOUNDS,
    minZoom: 3,
    renderWorldCopies: false,
    // Phones with 3x screens would fill 2.25x the pixels of 2x for no visible gain.
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    // Map credits live in the page footer (AppFooter), next to the map card.
    attributionControl: false,
  })
  map.touchZoomRotate.disableRotation()
  map.keyboard.disableRotation()
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')
  animator = createStationAnimator(map, prefersReducedMotion)
  resetView()

  map.on('style.load', () => {
    styleReady = true
    addOwnLayers()
  })
  for (const layer of STATION_LAYERS) {
    map.on('mousemove', layer, (event: MapLayerMouseEvent) => setHovered(stationAt(event)))
    map.on('mouseleave', layer, () => setHovered(null))
  }
  map.on('click', (event: maplibregl.MapMouseEvent) => {
    const hit = map?.queryRenderedFeatures(event.point, { layers: STATION_LAYERS })[0]
    const id = hit?.properties.id
    ui.selectStation(typeof id === 'string' ? id : null)
  })
  container.value.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && ui.selectedId !== null) ui.selectStation(null)
  })

  // A container measured while hidden or mid-layout gives a wrong initial view; reset it on resize.
  const markTouched = () => (viewTouched = true)
  for (const type of ['pointerdown', 'wheel', 'keydown'] as const) {
    container.value.addEventListener(type, markTouched, { once: true, passive: true })
  }
  resizeObserver = new ResizeObserver(() => {
    if (!map) return
    map.resize()
    if (!viewTouched) resetView()
  })
  resizeObserver.observe(container.value)
  applyStyle()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  animator?.stop()
  popup.remove()
  map?.remove()
  map = undefined
  animator = undefined
})

watch(() => [props.states, props.marks, props.showMarkers], syncMarkers)
watch(() => [ui.basin, ui.selectedId, locale.value], syncFilters)
watch(
  () => ui.selectedId,
  (id) => {
    focusSelection(id)
    syncRiverFocus()
    if (id !== null) popSelected(id)
  },
  { flush: 'post' },
)
watch(
  () => [props.states, props.marks, props.showMarkers],
  () => syncRivers(),
)
// Geo data arriving after the style still needs its layers.
watch(() => [rivers.data.value, border.data.value], addOwnLayers)
watch([isDark, locale], applyStyle)
</script>

<template>
  <div class="relative size-full">
    <div ref="container" class="size-full" role="region" :aria-label="t.map.ariaLabel"></div>
    <MapLegend :content="legend" class="absolute bottom-2.5 left-2.5 z-[1000]" />
  </div>
</template>
