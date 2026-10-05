<script setup lang="ts">
import 'leaflet/dist/leaflet.css'

import L from 'leaflet'
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { ANOMALY_CLASS_INFO, NO_DATA_STROKE } from '../../config/anomalyClasses'
import { formatDischarge, formatPct } from '../../lib/format'
import { useUiStore } from '../../stores/ui'
import type { StationState } from '../../types'
import { addBasemap } from './basemap'
import { createMapLegend } from './MapLegend'

const props = defineProps<{
  states: readonly StationState[]
  /** Markers appear only once discharge has loaded or failed. */
  showMarkers: boolean
}>()

const UKRAINE_BOUNDS: L.LatLngBoundsExpression = [
  [44.0, 22.0],
  [52.5, 40.3],
]
const SELECTED_ZOOM = 8
const SELECTED_STROKE = '#0f172a'
/** Fill when norms are unavailable and no class can be assigned. */
const UNCLASSIFIED_FILL = '#94a3b8'

const ui = useUiStore()
const container = useTemplateRef<HTMLDivElement>('container')

// Leaflet objects stay outside Vue reactivity: proxies break them.
let map: L.Map | undefined
let resizeObserver: ResizeObserver | undefined
/** Set once the user pans or zooms; until then a resize restores the initial view. */
let viewTouched = false
const markers = new Map<string, L.CircleMarker>()

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
}) as unknown as new () => L.SVG

function markerRadius(meanAnnual: number | null): number {
  if (meanAnnual === null || meanAnnual <= 0) return 8
  return Math.min(16, Math.max(6, 5 + 2.5 * Math.log10(meanAnnual)))
}

function markerStyle(state: StationState, selected: boolean): L.CircleMarkerOptions {
  const color = state.anomalyClass
    ? ANOMALY_CLASS_INFO[state.anomalyClass].color
    : UNCLASSIFIED_FILL
  const base = color
    ? { fillColor: color, fillOpacity: 0.95, color: '#fff', weight: 1.5 }
    : { fillOpacity: 0, color: NO_DATA_STROKE, weight: 2 }
  return selected ? { ...base, color: SELECTED_STROKE, weight: 3 } : base
}

function tooltipText({ station, current, anomalyPct }: StationState): string {
  const parts = [`${station.river} — ${station.place}`, `${formatDischarge(current)} м³/с`]
  if (anomalyPct !== null) parts.push(formatPct(anomalyPct))
  return parts.join(' · ')
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
    marker.setStyle(markerStyle(state, selected))
    marker.setRadius(markerRadius(state.meanAnnual))
    marker.setTooltipContent(tooltipText(state))

    const visible = ui.basin === 'all' || basin === ui.basin
    if (visible && !map.hasLayer(marker)) marker.addTo(map)
    if (!visible && map.hasLayer(marker)) marker.remove()
    if (visible && selected) marker.bringToFront()
  }
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
  addBasemap(map)
  resetView()
  createMapLegend().addTo(map)

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
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  map?.remove()
  map = undefined
  markers.clear()
})

watch(() => [props.states, props.showMarkers, ui.basin, ui.selectedId], syncMarkers)
watch(() => ui.selectedId, focusSelection)
</script>

<template>
  <div
    ref="container"
    class="size-full"
    role="region"
    aria-label="Карта станцій: колір маркера — стан водності"
  ></div>
</template>
