import {
  setWorkerUrl,
  type FilterSpecification,
  type LayerSpecification,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// `?worker&url` bundles the worker with its shared chunk; a plain `?url` copy fails to start.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

import { HIDDEN_LABELS_PATH, type HiddenLabelsFile } from '../../config/geo'
import type { Locale } from '../../i18n'

setWorkerUrl(workerUrl)

/** OpenFreeMap vector styles (OpenMapTiles schema): free, no key, any origin. */
const STYLE_URL = (dark: boolean) =>
  `https://tiles.openfreemap.org/styles/${dark ? 'dark' : 'positron'}`

/**
 * Water drawn by the basemap itself, so rivers and reservoirs fill their real banks.
 * The river lines from `rivers.geojson` stay on top for the station tint.
 */
const WATER = {
  light: { fill: '#a9c8f5', line: '#7aa7ea' },
  dark: { fill: '#1e3a6e', line: '#2f5597' },
}

// Esri's label layers are left out of the fallback: they use Russian-derived names such as "Kiev".
const ESRI_CANVAS_URL = (style: string) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${style}/MapServer/tile/{z}/{y}/{x}`
const ESRI_RELIEF_URL = (style: string) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/${style}/MapServer/tile/{z}/{y}/{x}`

/** Shaded relief over the basemap fills and under its labels. */
function reliefLayers(dark: boolean): Pick<StyleSpecification, 'sources' | 'layers'> {
  return {
    sources: {
      relief: {
        type: 'raster',
        tiles: [ESRI_RELIEF_URL(dark ? 'World_Hillshade_Dark' : 'World_Hillshade')],
        tileSize: 256,
        maxzoom: 16,
        attribution: 'Relief © Esri',
      },
    },
    layers: [
      {
        id: 'relief',
        type: 'raster',
        source: 'relief',
        paint: { 'raster-opacity': dark ? 0.3 : 0.35 },
      },
    ],
  }
}

/** Raster style used when the OpenFreeMap style cannot be loaded. */
function esriStyle(dark: boolean): StyleSpecification {
  const relief = reliefLayers(dark)
  return {
    version: 8,
    sources: {
      esri: {
        type: 'raster',
        tiles: [ESRI_CANVAS_URL(dark ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base')],
        tileSize: 256,
        maxzoom: 16,
        attribution: 'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors',
      },
      ...relief.sources,
    },
    layers: [{ id: 'esri', type: 'raster', source: 'esri' }, ...relief.layers],
  }
}

/**
 * Recolours the water, switches labels to the interface language (Latin names as fallback)
 * hides every label inside the `hiddenLabels` countries and slides the relief in under the
 * first label layer.
 */
function adaptStyle(
  style: StyleSpecification,
  dark: boolean,
  locale: Locale,
  hiddenLabels: HiddenLabelsFile | null,
): StyleSpecification {
  const water = dark ? WATER.dark : WATER.light
  const label = ['coalesce', ['get', `name:${locale}`], ['get', 'name:latin'], ['get', 'name']]
  const layers = style.layers.map((layer): LayerSpecification => {
    if (layer.type === 'fill' && layer['source-layer'] === 'water') {
      return { ...layer, paint: { ...layer.paint, 'fill-color': water.fill } }
    }
    if (layer.type === 'line' && layer['source-layer'] === 'waterway') {
      return { ...layer, paint: { ...layer.paint, 'line-color': water.line } }
    }
    if (layer.type === 'symbol' && layer.layout?.['text-field'] !== undefined) {
      const outside = hiddenLabels && (['!', ['within', hiddenLabels]] as FilterSpecification)
      const filter = outside
        ? ((layer.filter ? ['all', layer.filter, outside] : outside) as FilterSpecification)
        : layer.filter
      return { ...layer, filter, layout: { ...layer.layout, 'text-field': label } } as typeof layer
    }
    return layer
  })
  const relief = reliefLayers(dark)
  const firstLabel = layers.findIndex((layer) => layer.type === 'symbol')
  const at = firstLabel === -1 ? layers.length : firstLabel
  layers.splice(at, 0, ...relief.layers)
  return { ...style, sources: { ...style.sources, ...relief.sources }, layers }
}

/** Label mask, or null (all labels shown) when it cannot be loaded. */
async function loadHiddenLabels(): Promise<HiddenLabelsFile | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${HIDDEN_LABELS_PATH}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return (await response.json()) as HiddenLabelsFile
  } catch (error) {
    console.warn('Label mask failed to load; showing all basemap labels', error)
    return null
  }
}

/**
 * OpenFreeMap vector style for a theme and label language, or the Esri raster style when the
 * vector style fails to load.
 */
export async function basemapStyle(dark: boolean, locale: Locale): Promise<StyleSpecification> {
  try {
    const [response, hiddenLabels] = await Promise.all([fetch(STYLE_URL(dark)), loadHiddenLabels()])
    if (!response.ok) throw new Error(`OpenFreeMap style: HTTP ${response.status}`)
    return adaptStyle((await response.json()) as StyleSpecification, dark, locale, hiddenLabels)
  } catch (error) {
    console.warn('Vector basemap failed to load; switching to Esri Gray Canvas', error)
    return esriStyle(dark)
  }
}
