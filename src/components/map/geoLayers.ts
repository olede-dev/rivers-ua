import L from 'leaflet'

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
/** Outline under the focused river reach, in the basemap's tone. */
const CASING_COLORS = { light: '#ffffff', dark: '#0f172a' }
/** Opacity factor for rivers outside the selected station's reach. */
const DIMMED = 0.3
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
 * positions.
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
 * Splits the rivers into runs that share a tinting station and a fade step. The geometry
 * depends only on station positions, so a date change in the timelapse only recolours the
 * runs (`styleRivers`) instead of rebuilding the paths.
 */
function riverRuns(data: RiversFile, states: readonly StationState[]): RiversFile {
  const reach = riverReach(data, states, REACH_KM)
  const propsAt = (r: SegmentReach | null) =>
    r
      ? {
          tintId: r.id,
          tintStep: Math.min(FADE_STEPS - 1, Math.floor((r.km / REACH_KM) * FADE_STEPS)),
        }
      : {}
  const features: RiversFile['features'] = []
  data.features.forEach((feature, f) => {
    linesOf(feature.geometry).forEach((line, l) => {
      const same = (p: ReturnType<typeof propsAt>, q: ReturnType<typeof propsAt>) =>
        p.tintId === q.tintId && p.tintStep === q.tintStep
      let run: Position[] = [line[0]]
      let runProps = propsAt(reach[f][l][0])
      const flush = () =>
        features.push({
          type: 'Feature',
          properties: { ...feature.properties, ...runProps },
          geometry: { type: 'LineString', coordinates: run },
        })
      for (let i = 1; i < line.length; i++) {
        const props = propsAt(reach[f][l][i - 1])
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

const CASING_CLASS = 'river-casing'

/**
 * The river lines over a casing layer that outlines only the focused reach. Colours and
 * weights come from `styleRivers`.
 */
export function createRiversLayer(
  data: RiversFile,
  states: readonly StationState[],
  renderer: L.Renderer,
): L.FeatureGroup {
  const runs = states.length > 0 ? riverRuns(data, states) : data
  // L.geoJSON passes its own options to every path it creates, renderer included.
  const options = (className: string): L.GeoJSONOptions & L.PathOptions => ({
    pane: RIVERS_PANE,
    renderer,
    interactive: false,
    className,
    style: () => ({ lineCap: 'round', lineJoin: 'round' }),
  })
  return L.featureGroup([L.geoJSON(runs, options(CASING_CLASS)), L.geoJSON(runs, options(''))])
}

/** Stations whose river reach stands out: the selection dims the rest, a hover only outlines. */
export interface RiverFocus {
  selected: string | null
  hovered: string | null
}

/**
 * Rivers near a station take its tint (`tints`, by station id), fading back to the plain river
 * colour with network distance. A `null` tint keeps the plain colour, so only notable stations
 * stand out. Tinted reaches are drawn a little thicker so the colour reads at country zoom.
 * The focused station's reach is drawn wider over a casing; a selection also dims every other
 * river.
 */
export function styleRivers(
  layer: L.FeatureGroup,
  tints: ReadonlyMap<string, string | null>,
  zoom: number,
  dark: boolean,
  focus: RiverFocus,
): void {
  const base = geoColors(dark).river
  const casing = dark ? CASING_COLORS.dark : CASING_COLORS.light
  const focusId = focus.selected ?? focus.hovered
  layer.eachLayer((child) => {
    const casingLayer = ((child as L.GeoJSON).options as L.PathOptions).className === CASING_CLASS
    ;(child as L.GeoJSON).setStyle((feature) => {
      const props = feature?.properties ?? { major: false }
      const weight = riverWeight(props.major === true, zoom)
      const focused = focusId !== null && props.tintId === focusId
      const fade = focus.selected !== null && !focused ? DIMMED : 1
      if (casingLayer) {
        return focused
          ? { color: casing, opacity: 0.9, weight: weight + 6 }
          : { opacity: 0, weight }
      }
      const color = props.tintId === undefined ? null : (tints.get(props.tintId) ?? null)
      if (focused) {
        const step = color ? (props.tintStep ?? 0) / FADE_STEPS : 0
        return { color: color ? mix(color, base, step) : base, opacity: 1, weight: weight + 2.5 }
      }
      if (!color) return { color: base, opacity: (props.major ? 0.85 : 0.6) * fade, weight }
      return {
        color: mix(color, base, (props.tintStep ?? 0) / FADE_STEPS),
        opacity: 0.95 * fade,
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
