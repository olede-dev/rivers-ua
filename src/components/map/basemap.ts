import L from 'leaflet'

/**
 * Public CARTO Basemaps key (non-commercial tier). It ships in the bundle by design;
 * CARTO accepts it only from the allowed Origin, https://olede-dev.github.io.
 */
const CARTO_KEY = 'cb1_4a4l_1_48d5c1569ad39b00ae334548'

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

/** CARTO Positron for the light theme, Dark Matter for the dark one. */
function carto(dark: boolean): L.TileLayer {
  const style = dark ? 'dark_all' : 'light_all'
  return L.tileLayer(`https://basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`, {
    attribution: '© OpenStreetMap contributors © CARTO',
    maxZoom: 19,
    // Makes the browser send Origin, which CARTO checks against the key's allowed sites.
    crossOrigin: 'anonymous',
  })
}

function esriCanvas(dark: boolean): L.TileLayer {
  return L.tileLayer(ESRI_CANVAS_URL(dark ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base'), {
    attribution: 'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors',
    maxZoom: 16,
  })
}

/**
 * CARTO, falling back to Esri Gray Canvas once a CARTO tile fails: CARTO rejects origins
 * outside the key's list (localhost) and may be unavailable. Returns a function that swaps
 * the basemap to the given theme; after a fallback it stays on Esri.
 */
export function addBasemap(map: L.Map, dark: boolean): (dark: boolean) => void {
  let cartoFailed = false
  let current: L.TileLayer | undefined
  let shade: L.TileLayer | undefined
  map.createPane(RELIEF_PANE).style.zIndex = '250'

  function show(dark: boolean) {
    current?.remove()
    shade?.remove()
    shade = relief(dark).addTo(map)
    if (cartoFailed) {
      current = esriCanvas(dark).addTo(map)
      return
    }
    const layer = carto(dark)
    layer.once('tileerror', () => {
      if (current !== layer) return
      console.warn('CARTO basemap tile failed to load; switching to Esri Gray Canvas')
      cartoFailed = true
      show(dark)
    })
    current = layer.addTo(map)
  }

  show(dark)
  return show
}
