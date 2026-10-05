import L from 'leaflet'

import type { BorderFile, RiversFile } from '../../config/geo'

/**
 * Between the basemap (tilePane, 200) and the station markers (overlayPane, 400). The border
 * pane sits above the rivers so its veil also dims rivers outside Ukraine.
 */
export const RIVERS_PANE = 'rivers'
export const BORDER_PANE = 'border'

const RIVER_COLOR = '#2563eb'
const BORDER_COLOR = '#7c93c3'
const BORDER_HALO_COLOR = '#fde68a'
/** Light veil over everything outside Ukraine so the country reads as the focus. */
const OUTSIDE_VEIL = { color: '#ffffff', opacity: 0.45 }
const WORLD_RING: L.LatLngTuple[] = [
  [-85, -180],
  [-85, 180],
  [85, 180],
  [85, -180],
]

export function createGeoPanes(map: L.Map): void {
  map.createPane(RIVERS_PANE).style.zIndex = '340'
  map.createPane(BORDER_PANE).style.zIndex = '350'
}

/** Stroke widths grow with zoom so rivers stay visible over the city-level basemap. */
function riverWeight(major: boolean, zoom: number): number {
  const base = major ? 1.6 : 0.9
  return base + Math.max(0, zoom - 6) * (major ? 0.6 : 0.35)
}

export function createRiversLayer(data: RiversFile, renderer: L.Renderer): L.GeoJSON {
  // L.geoJSON passes its own options to every path it creates, renderer included.
  const options: L.GeoJSONOptions & Pick<L.PathOptions, 'renderer'> = {
    pane: RIVERS_PANE,
    renderer,
    interactive: false,
    style: (feature) => ({
      color: RIVER_COLOR,
      opacity: feature?.properties.major ? 0.85 : 0.6,
      lineCap: 'round',
      lineJoin: 'round',
    }),
  }
  return L.geoJSON(data, options)
}

export function restyleRivers(layer: L.GeoJSON, zoom: number): void {
  layer.setStyle((feature) => ({ weight: riverWeight(feature?.properties.major === true, zoom) }))
}

function outerRings(border: BorderFile): L.LatLngTuple[][] {
  return border.geometry.coordinates.map((polygon) =>
    polygon[0].map(([lon, lat]): L.LatLngTuple => [lat, lon]),
  )
}

/** Veil outside the country, a soft yellow halo and a light blue-grey outline along the border. */
export function createBorderLayer(border: BorderFile, renderer: L.Renderer): L.LayerGroup {
  const rings = outerRings(border)
  const common = { pane: BORDER_PANE, interactive: false, renderer, lineJoin: 'round' as const }
  return L.layerGroup([
    L.polygon([WORLD_RING, ...rings], {
      ...common,
      stroke: false,
      fillColor: OUTSIDE_VEIL.color,
      fillOpacity: OUTSIDE_VEIL.opacity,
    }),
    L.polyline(rings, { ...common, color: BORDER_HALO_COLOR, weight: 5, opacity: 0.35 }),
    L.polyline(rings, { ...common, color: BORDER_COLOR, weight: 1.25, opacity: 0.7 }),
  ])
}
