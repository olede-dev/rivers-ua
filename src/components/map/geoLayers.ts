import L from 'leaflet'

import { ANOMALY_CLASS_INFO } from '../../config/anomalyClasses'
import type { BorderFile, RiversFile } from '../../config/geo'
import type { Position } from '../../lib/geometry'
import { assignRiverReach, type SegmentReach } from '../../lib/riverReach'
import type { StationState } from '../../types'

/**
 * Between the basemap (tilePane, 200) and the station markers (overlayPane, 400). The border
 * pane sits above the rivers so its veil also dims rivers outside Ukraine.
 */
export const RIVERS_PANE = 'rivers'
export const BORDER_PANE = 'border'

/** The veil over everything outside Ukraine makes the country read as the focus. */
const GEO_COLORS = {
  light: {
    river: '#2563eb',
    border: '#7c93c3',
    halo: '#fde68a',
    haloOpacity: 0.35,
    veil: '#ffffff',
  },
  dark: { river: '#60a5fa', border: '#94a3b8', halo: '#facc15', haloOpacity: 0.2, veil: '#020617' },
}
/** Dots drifting downstream along every river line; see `.river-flow` in main.css. */
const FLOW_COLORS = { light: '#ffffff', dark: '#e0f2fe' }

export type FlowSpeed = 'slow' | 'medium' | 'fast'
/** Discharge thresholds, m³/s: small rivers drift slowly, the Dnipro runs fast. */
function flowSpeed(q: number | null): FlowSpeed | undefined {
  if (q === null) return undefined
  return q < 50 ? 'slow' : q < 500 ? 'medium' : 'fast'
}
const VEIL_OPACITY = 0.45

const geoColors = (dark: boolean) => (dark ? GEO_COLORS.dark : GEO_COLORS.light)
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

/** How far downstream and upstream a station tints its river, and how far it may sit off it. */
const REACH_KM = 120
const SNAP_KM = 4
/** Tint steps from the station outwards; the last step is closest to the plain river colour. */
const FADE_STEPS = 4

function linesOf(geometry: RiversFile['features'][number]['geometry']): Position[][] {
  return geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates
}

/**
 * Segment reach per feature, cached per river file and reach: it depends only on station
 * positions. The tint uses `REACH_KM`; the flow speed takes the nearest station at any distance.
 */
const reachCaches = new Map<number, WeakMap<RiversFile, (SegmentReach | null)[][][]>>()
function riverReach(data: RiversFile, states: readonly StationState[], maxKm: number) {
  let cache = reachCaches.get(maxKm)
  if (!cache) reachCaches.set(maxKm, (cache = new WeakMap()))
  let reach = cache.get(data)
  if (!reach) {
    const lines = data.features.map((f) => linesOf(f.geometry))
    const flat = assignRiverReach(
      lines.flat(),
      states.map(({ station }) => ({
        id: station.id,
        position: [station.marker.lon, station.marker.lat],
      })),
      maxKm,
      SNAP_KM,
    )
    let next = 0
    reach = lines.map((featureLines) => featureLines.map(() => flat[next++]))
    cache.set(data, reach)
  }
  return reach
}

function mix(from: string, to: string, t: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16)
  const parts = [0, 1, 2].map((i) =>
    Math.round(channel(from, i) + (channel(to, i) - channel(from, i)) * t)
      .toString(16)
      .padStart(2, '0'),
  )
  return `#${parts.join('')}`
}

/**
 * Splits the rivers into runs that share a tinting station, a fade step and a flow speed.
 * The geometry depends only on station positions and flow speeds, so a date change in the
 * timelapse only recolours the runs (`styleRivers`) instead of rebuilding the paths.
 */
function riverRuns(data: RiversFile, states: readonly StationState[]): RiversFile {
  const speedOf = new Map(states.map((s) => [s.station.id, flowSpeed(s.current)]))
  const reach = riverReach(data, states, REACH_KM)
  const flowReach = riverReach(data, states, Infinity)
  const tintOf = (r: SegmentReach | null) =>
    r
      ? {
          tintId: r.id,
          tintStep: Math.min(FADE_STEPS - 1, Math.floor((r.km / REACH_KM) * FADE_STEPS)),
        }
      : {}
  const features: RiversFile['features'] = []
  data.features.forEach((feature, f) => {
    linesOf(feature.geometry).forEach((line, l) => {
      // Every river flows; networks without a station get a speed from their rank.
      const fallback: FlowSpeed = feature.properties.major ? 'medium' : 'slow'
      const propsAt = (i: number) => {
        const r = flowReach[f][l][i]
        return { ...tintOf(reach[f][l][i]), flow: (r && speedOf.get(r.id)) ?? fallback }
      }
      const same = (p: ReturnType<typeof propsAt>, q: ReturnType<typeof propsAt>) =>
        p.tintId === q.tintId && p.tintStep === q.tintStep && p.flow === q.flow
      let run: Position[] = [line[0]]
      let runProps = propsAt(0)
      const flush = () =>
        features.push({
          type: 'Feature',
          properties: { ...feature.properties, ...runProps },
          geometry: { type: 'LineString', coordinates: run },
        })
      for (let i = 1; i < line.length; i++) {
        const props = propsAt(i - 1)
        if (!same(props, runProps)) {
          flush()
          run = [line[i - 1]]
          runProps = props
        }
        run.push(line[i])
      }
      flush()
    })
  })
  return { type: 'FeatureCollection', features }
}

/** Changes whenever a station's flow speed does; the river layer is rebuilt only then. */
export function flowSignature(states: readonly StationState[]): string {
  return states.map((s) => flowSpeed(s.current) ?? '-').join()
}

/**
 * The river lines plus, when stations are known, a dotted overlay per flow speed. Each speed
 * gets its own GeoJSON layer because Leaflet sets `className` only when a path is created.
 * Colours and weights come from `styleRivers`.
 */
export function createRiversLayer(
  data: RiversFile,
  states: readonly StationState[],
  renderer: L.Renderer,
  dark: boolean,
): L.FeatureGroup {
  const runs = states.length > 0 ? riverRuns(data, states) : data
  // L.geoJSON passes its own options to every path it creates, renderer included.
  const options: L.GeoJSONOptions & Pick<L.PathOptions, 'renderer'> = {
    pane: RIVERS_PANE,
    renderer,
    interactive: false,
    style: () => ({ lineCap: 'round', lineJoin: 'round' }),
  }
  const group = L.featureGroup([L.geoJSON(runs, options)])
  for (const speed of ['slow', 'medium', 'fast'] as const) {
    const features = runs.features.filter((f) => f.properties.flow === speed)
    if (features.length === 0) continue
    const flowOptions: L.GeoJSONOptions & L.PathOptions = {
      pane: RIVERS_PANE,
      renderer,
      interactive: false,
      className: `river-flow river-flow--${speed}`,
      style: () => ({
        color: dark ? FLOW_COLORS.dark : FLOW_COLORS.light,
        opacity: dark ? 0.55 : 0.8,
        dashArray: '1 10',
        lineCap: 'round',
      }),
    }
    const flowData: RiversFile = { type: 'FeatureCollection', features }
    group.addLayer(L.geoJSON(flowData, flowOptions))
  }
  return group
}

/**
 * Rivers near a station take its water-state colour, fading back to the plain river colour
 * with network distance. The normal class keeps the plain colour, so only anomalies stand out.
 * Tinted reaches are drawn a little thicker so the colour reads at country zoom.
 */
export function styleRivers(
  layer: L.FeatureGroup,
  states: readonly StationState[],
  zoom: number,
  dark: boolean,
): void {
  const base = geoColors(dark).river
  const classOf = new Map(states.map((s) => [s.station.id, s.anomalyClass]))
  layer.eachLayer((child) => {
    const flowLayer =
      ((child as L.GeoJSON).options as L.PathOptions).className?.includes('river-flow') === true
    ;(child as L.GeoJSON).setStyle((feature) => {
      const props = feature?.properties ?? { major: false }
      const weight = riverWeight(props.major === true, zoom)
      if (flowLayer) return { weight: Math.max(1.2, weight * 0.7) }
      const anomaly = props.tintId === undefined ? null : classOf.get(props.tintId)
      const color = anomaly && anomaly !== 'normal' ? ANOMALY_CLASS_INFO[anomaly].color : null
      if (!color) return { color: base, opacity: props.major ? 0.85 : 0.6, weight }
      return {
        color: mix(color, base, (props.tintStep ?? 0) / FADE_STEPS),
        opacity: 0.95,
        weight: weight + 1.2,
      }
    })
  })
}

function outerRings(border: BorderFile): L.LatLngTuple[][] {
  return border.geometry.coordinates.map((polygon) =>
    polygon[0].map(([lon, lat]): L.LatLngTuple => [lat, lon]),
  )
}

/** Veil outside the country, a soft yellow halo and a blue-grey outline along the border. */
export function createBorderLayer(
  border: BorderFile,
  renderer: L.Renderer,
  dark: boolean,
): L.LayerGroup {
  const colors = geoColors(dark)
  const rings = outerRings(border)
  const common = { pane: BORDER_PANE, interactive: false, renderer, lineJoin: 'round' as const }
  return L.layerGroup([
    L.polygon([WORLD_RING, ...rings], {
      ...common,
      stroke: false,
      fillColor: colors.veil,
      fillOpacity: VEIL_OPACITY,
    }),
    L.polyline(rings, { ...common, color: colors.halo, weight: 5, opacity: colors.haloOpacity }),
    L.polyline(rings, { ...common, color: colors.border, weight: 1.25, opacity: 0.7 }),
  ])
}
