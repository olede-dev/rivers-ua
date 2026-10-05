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

const SOURCE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson'
/** Cheap pre-filter before the exact cut along the border. */
const RIVERS_BOX: BBox = [21.5, 43.9, 41, 53]
/** ≈1.5 km: river pieces this close to the border on both ends are kept (border rivers). */
const BORDER_RIVER_TOLERANCE = 0.015
const RIVER_TOLERANCE = 0.004
const BORDER_TOLERANCE = 0.002
const DIGITS = 3
const MAX_RIVERS_BYTES = 300 * 1024

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
const riversBytes = await writeJson(RIVERS_PATH, rivers)
if (riversBytes > MAX_RIVERS_BYTES) {
  throw new Error(`${RIVERS_PATH} is ${riversBytes} bytes, over the ${MAX_RIVERS_BYTES} budget`)
}

console.log(`Wrote ${rivers.features.length} river features (${riversBytes} B) to ${RIVERS_PATH}`)
console.log(`Wrote Ukraine border (${borderBytes} B) to ${BORDER_PATH}`)
