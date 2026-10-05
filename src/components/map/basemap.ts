import L from 'leaflet'
import '@maplibre/maplibre-gl-leaflet'
import { setWorkerUrl, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// `?worker&url` bundles the worker with its shared chunk; a plain `?url` copy fails to start.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

import type { Locale } from '../../i18n'

setWorkerUrl(workerUrl)

/** OpenFreeMap vector styles (OpenMapTiles schema): free, no key, any origin. */
const STYLE_URL = (dark: boolean) =>
  `https://tiles.openfreemap.org/styles/${dark ? 'dark' : 'positron'}`

/**
 * Water drawn by the basemap itself, so rivers and reservoirs fill their real banks.
 * The river lines from `rivers.geojson` stay on top for the station tint and the flow.
 */
const WATER = {
  light: { fill: '#a9c8f5', line: '#7aa7ea' },
  dark: { fill: '#1e3a6e', line: '#2f5597' },
}

// Esri's label layers are left out of the fallback: they use Russian-derived names such as "Kiev".
const ESRI_CANVAS_URL = (style: string) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${style}/MapServer/tile/{z}/{y}/{x}`

/** Shaded relief between the basemap and the rivers; blended in main.css (`.leaflet-relief-pane`). */
export const RELIEF_PANE = 'relief'

function relief(dark: boolean): L.TileLayer {
  const style = dark ? 'World_Hillshade_Dark' : 'World_Hillshade'
  return L.tileLayer(
    `https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/${style}/MapServer/tile/{z}/{y}/{x}`,
    { attribution: 'Relief © Esri', maxZoom: 16, pane: RELIEF_PANE, opacity: dark ? 0.35 : 0.4 },
  )
}

function esriCanvas(dark: boolean): L.TileLayer {
  return L.tileLayer(ESRI_CANVAS_URL(dark ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base'), {
    attribution: 'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors',
    maxZoom: 16,
  })
}

/** Recolours the water and switches labels to the interface language, Latin names as fallback. */
function adaptStyle(style: StyleSpecification, dark: boolean, locale: Locale): StyleSpecification {
  const water = dark ? WATER.dark : WATER.light
  const label = ['coalesce', ['get', `name:${locale}`], ['get', 'name:latin'], ['get', 'name']]
  return {
    ...style,
    layers: style.layers.map((layer) => {
      if (layer.type === 'fill' && layer['source-layer'] === 'water') {
        return { ...layer, paint: { ...layer.paint, 'fill-color': water.fill } }
      }
      if (layer.type === 'line' && layer['source-layer'] === 'waterway') {
        return { ...layer, paint: { ...layer.paint, 'line-color': water.line } }
      }
      if (layer.type === 'symbol' && layer.layout?.['text-field'] !== undefined) {
        return { ...layer, layout: { ...layer.layout, 'text-field': label } } as typeof layer
      }
      return layer
    }),
  }
}

async function loadStyle(dark: boolean, locale: Locale): Promise<StyleSpecification> {
  const response = await fetch(STYLE_URL(dark))
  if (!response.ok) throw new Error(`OpenFreeMap style: HTTP ${response.status}`)
  return adaptStyle((await response.json()) as StyleSpecification, dark, locale)
}

/**
 * OpenFreeMap vector basemap, falling back to Esri Gray Canvas when its style fails to load.
 * Returns a function that restyles the basemap for a theme and label language.
 */
export function addBasemap(
  map: L.Map,
  dark: boolean,
  locale: Locale,
): (dark: boolean, locale: Locale) => void {
  map.createPane(RELIEF_PANE).style.zIndex = '250'
  let shade: L.TileLayer | undefined
  let vector: L.MaplibreGL | undefined
  let fallback: L.TileLayer | undefined
  let request = 0

  function show(dark: boolean, locale: Locale) {
    shade?.remove()
    shade = relief(dark).addTo(map)
    const own = ++request
    loadStyle(dark, locale)
      .then((style) => {
        if (own !== request) return
        fallback?.remove()
        fallback = undefined
        if (vector) vector.getMaplibreMap().setStyle(style)
        else {
          vector = L.maplibreGL({
            style,
            attributionControl: false,
          }).addTo(map)
          map.attributionControl?.addAttribution(
            '<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/">OpenMapTiles</a> © OpenStreetMap contributors',
          )
        }
      })
      .catch((error: unknown) => {
        if (own !== request) return
        console.warn('Vector basemap failed to load; switching to Esri Gray Canvas', error)
        vector?.remove()
        vector = undefined
        fallback?.remove()
        fallback = esriCanvas(dark).addTo(map)
      })
  }

  show(dark, locale)
  return show
}
