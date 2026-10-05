// Downloads Natural Earth 1:10m rivers and the Ukraine border, simplifies them, cuts the
// rivers along the border, and writes public/data/rivers.geojson and public/data/ukraine-border.geojson. The border
// comes from Natural Earth's Ukrainian point-of-view layer, which includes Crimea.
import { writeFile } from 'node:fs/promises'

import type { Feature, FeatureCollection, Geometry, LineString, MultiLineString } from 'geojson'

import { BORDER_PATH, RIVERS_PATH, type BorderFile, type RiversFile } from '../src/config/geo'
import {
  clipLineToBox,
  clipLineToRings,
  roundLine,
  simplifyLine,
  type BBox,
  type Position,
} from '../src/lib/geometry'
import { getJson } from '../src/api/http'
import { looseEnds, orientDownstream } from '../src/lib/riverFlow'
import { retryOnRateLimit } from './lib/rate-limit'

const SOURCE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson'
/** Cheap pre-filter before the exact cut along the border. */
const RIVERS_BOX: BBox = [21.5, 43.9, 41, 53]
/** ≈1.5 km: river pieces this close to the border on both ends are kept (border rivers). */
const BORDER_RIVER_TOLERANCE = 0.015
const RIVER_TOLERANCE = 0.004
const BORDER_TOLERANCE = 0.002
const DIGITS = 3
const MAX_RIVERS_BYTES = 300 * 1024
const ELEVATION_URL = 'https://api.open-meteo.com/v1/elevation'
/** The elevation API takes at most 100 coordinates per request. */
const ELEVATION_BATCH = 100

async function download(name: string): Promise<FeatureCollection> {
  const response = await fetch(`${SOURCE}/${name}.geojson`)
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`)
  return (await response.json()) as FeatureCollection
}

function linesOf(geometry: Geometry | null): Position[][] {
  if (geometry?.type === 'LineString') return [geometry.coordinates]
  if (geometry?.type === 'MultiLineString') return geometry.coordinates
  return []
}

function prepareLine(line: Position[], tolerance: number): Position[] {
  return roundLine(simplifyLine(line, tolerance), DIGITS)
}

function riverFeatures(
  source: FeatureCollection,
  major: boolean,
  borderRings: Position[][],
): Feature<LineString | MultiLineString, { major: boolean }>[] {
  const features: Feature<LineString | MultiLineString, { major: boolean }>[] = []
  for (const feature of source.features) {
    const lines = linesOf(feature.geometry)
      .flatMap((line) => clipLineToBox(line, RIVERS_BOX))
      .map((line) => simplifyLine(line, RIVER_TOLERANCE))
      .flatMap((line) => clipLineToRings(line, borderRings, BORDER_RIVER_TOLERANCE))
      .map((line) => roundLine(line, DIGITS))
      .filter((line) => line.length >= 2)
    if (lines.length === 0) continue
    features.push({
      type: 'Feature',
      properties: { major },
      geometry:
        lines.length === 1
          ? { type: 'LineString', coordinates: lines[0] }
          : { type: 'MultiLineString', coordinates: lines },
    })
  }
  return features
}

/** Terrain height of every point, metres, from the Open-Meteo Elevation API. */
async function elevations(points: Position[]): Promise<Map<string, number>> {
  const heights = new Map<string, number>()
  for (let i = 0; i < points.length; i += ELEVATION_BATCH) {
    const batch = points.slice(i, i + ELEVATION_BATCH)
    const url = new URL(ELEVATION_URL)
    url.searchParams.set('latitude', batch.map((p) => p[1]).join(','))
    url.searchParams.set('longitude', batch.map((p) => p[0]).join(','))
    const body = (await retryOnRateLimit('elevation', () => getJson(url))) as {
      elevation: number[]
    }
    batch.forEach((p, k) => heights.set(`${p[0]},${p[1]}`, body.elevation[k]))
  }
  return heights
}

/**
 * Reorders every river line to run downstream, so the map's flow animation (which follows
 * the drawing direction) moves with the current. Natural Earth lines are not consistently
 * drawn that way.
 */
async function orientRivers(rivers: RiversFile): Promise<void> {
  const lines = rivers.features.flatMap((f) => linesOf(f.geometry))
  const oriented = orientDownstream(lines, await elevations(looseEnds(lines)))
  let next = 0
  for (const feature of rivers.features) {
    const count = linesOf(feature.geometry).length
    const own = oriented.slice(next, next + count)
    next += count
    feature.geometry =
      own.length === 1
        ? { type: 'LineString', coordinates: own[0] }
        : { type: 'MultiLineString', coordinates: own }
  }
}

async function writeJson(path: string, value: unknown): Promise<number> {
  const text = `${JSON.stringify(value)}\n`
  await writeFile(new URL(`../public/${path}`, import.meta.url), text)
  return Buffer.byteLength(text)
}

const [mainRivers, europeRivers, countries] = await Promise.all([
  download('ne_10m_rivers_lake_centerlines'),
  download('ne_10m_rivers_europe'),
  download('ne_10m_admin_0_countries_ukr'),
])

const ukraine = countries.features.find((f) => f.properties?.ADM0_A3 === 'UKR')
if (ukraine?.geometry?.type !== 'MultiPolygon' && ukraine?.geometry?.type !== 'Polygon') {
  throw new Error('Ukraine polygon not found in ne_10m_admin_0_countries_ukr')
}
const polygons =
  ukraine.geometry.type === 'Polygon'
    ? [ukraine.geometry.coordinates]
    : ukraine.geometry.coordinates
const border: BorderFile = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'MultiPolygon',
    coordinates: polygons.map((rings) => rings.map((ring) => prepareLine(ring, BORDER_TOLERANCE))),
  },
}
const borderBytes = await writeJson(BORDER_PATH, border)

// Cut along the simplified border that the map draws, so river ends meet the drawn line.
const borderRings = border.geometry.coordinates.flat()
// Tributaries first: the main lines are drawn over them where the two sources overlap.
const rivers: RiversFile = {
  type: 'FeatureCollection',
  features: [
    ...riverFeatures(europeRivers, false, borderRings),
    ...riverFeatures(mainRivers, true, borderRings),
  ],
}
await orientRivers(rivers)
const riversBytes = await writeJson(RIVERS_PATH, rivers)
if (riversBytes > MAX_RIVERS_BYTES) {
  throw new Error(`${RIVERS_PATH} is ${riversBytes} bytes, over the ${MAX_RIVERS_BYTES} budget`)
}

console.log(`Wrote ${rivers.features.length} river features (${riversBytes} B) to ${RIVERS_PATH}`)
console.log(`Wrote Ukraine border (${borderBytes} B) to ${BORDER_PATH}`)
