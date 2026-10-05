import L from 'leaflet'

/**
 * Public CARTO Basemaps key (non-commercial tier). It ships in the bundle by design;
 * CARTO accepts it only from the allowed Origin, https://olede-dev.github.io.
 */
const CARTO_KEY = 'cb1_4a4l_1_48d5c1569ad39b00ae334548'

// Esri's label layer is left out of the fallback: it uses Russian-derived names such as "Kiev".
const ESRI_LIGHT_GRAY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'

function cartoPositron(): L.TileLayer {
  return L.tileLayer(
    `https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
    {
      attribution: '© OpenStreetMap contributors © CARTO',
      maxZoom: 19,
      // Makes the browser send Origin, which CARTO checks against the key's allowed sites.
      crossOrigin: 'anonymous',
    },
  )
}

function esriLightGray(): L.TileLayer {
  return L.tileLayer(ESRI_LIGHT_GRAY_URL, {
    attribution: 'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors',
    maxZoom: 16,
  })
}

/**
 * CARTO Positron, falling back to Esri Light Gray Canvas once a CARTO tile fails:
 * CARTO rejects origins outside the key's list (localhost) and may be unavailable.
 */
export function addBasemap(map: L.Map): void {
  const carto = cartoPositron()
  carto.once('tileerror', () => {
    console.warn('CARTO basemap tile failed to load; switching to Esri Light Gray Canvas')
    carto.remove()
    esriLightGray().addTo(map)
  })
  carto.addTo(map)
}
