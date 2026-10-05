// Refines approximate station coordinates against GloFAS: for each station it
// samples a grid of nearby points, keeps the one with the largest mean
// discharge (the main river, not a tributary) and checks it against the
// expected order of magnitude. Writes src/config/stations.generated.json.
import { writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

import { fetchDischargeHistory } from '../src/api/flood'
import { STATION_SEEDS } from '../src/config/station-seeds'
import { mean, nonNull, roundTo } from '../src/lib/stats'
import type { Coordinates, StationSeed } from '../src/types'
import { retryOnRateLimit } from './lib/rate-limit'

const PERIOD = { startDate: '2010-01-01', endDate: '2019-12-31' }
const GRID_STEP_DEG = 0.05
// Search ±0.05° first; widen to ±0.1° only when the nearer grid misses the range.
const SEARCH_RADII_STEPS = [1, 2]
// Modelled discharge may differ from gauged values; accept ×0.3…×3 of the expectation.
const TOLERANCE = { low: 0.3, high: 3 }
const PAUSE_MS = 300
const TIMEOUT_MS = 120_000
const OUTPUT = new URL('../src/config/stations.generated.json', import.meta.url)

interface Candidate extends Coordinates {
  meanDischarge: number
}

function grid(center: Coordinates, steps: number): Coordinates[] {
  const points: Coordinates[] = []
  for (let dy = -steps; dy <= steps; dy++) {
    for (let dx = -steps; dx <= steps; dx++) {
      points.push({
        lat: roundTo(center.lat + dy * GRID_STEP_DEG, 2),
        lon: roundTo(center.lon + dx * GRID_STEP_DEG, 2),
      })
    }
  }
  return points
}

function inRange(seed: StationSeed, value: number): boolean {
  const [low, high] = seed.expectedMeanRange
  return value >= low * TOLERANCE.low && value <= high * TOLERANCE.high
}

async function bestCandidate(seed: StationSeed, steps: number): Promise<Candidate> {
  const points = grid(seed, steps)
  const series = await retryOnRateLimit(seed.id, () =>
    fetchDischargeHistory(points, PERIOD, { timeoutMs: TIMEOUT_MS }),
  )
  const candidates = points.flatMap((point, i): Candidate[] => {
    const values = nonNull(series[i].discharge)
    return values.length > 0 ? [{ ...point, meanDischarge: mean(values) }] : []
  })
  if (candidates.length === 0) throw new Error(`${seed.id}: no discharge data near the station`)
  return candidates.reduce((best, c) => (c.meanDischarge > best.meanDischarge ? c : best))
}

async function validate(seed: StationSeed) {
  let candidate: Candidate | undefined
  let radiusDeg = 0
  for (const steps of SEARCH_RADII_STEPS) {
    if (candidate) await sleep(PAUSE_MS)
    candidate = await bestCandidate(seed, steps)
    radiusDeg = roundTo(steps * GRID_STEP_DEG, 2)
    if (inRange(seed, candidate.meanDischarge)) break
  }
  if (!candidate) throw new Error(`${seed.id}: no search radius configured`)
  return {
    id: seed.id,
    lat: candidate.lat,
    lon: candidate.lon,
    meanDischarge: roundTo(candidate.meanDischarge, 1),
    inExpectedRange: inRange(seed, candidate.meanDischarge),
    searchRadiusDeg: radiusDeg,
  }
}

const results = []
for (const [i, seed] of STATION_SEEDS.entries()) {
  if (i > 0) await sleep(PAUSE_MS)
  results.push(await validate(seed))
}

console.table(
  results.map((r, i) => {
    const seed = STATION_SEEDS[i]
    return {
      id: r.id,
      seed: `${seed.lat}, ${seed.lon}`,
      chosen: `${r.lat}, ${r.lon}`,
      'mean, m³/s': r.meanDischarge,
      expected: `${seed.expectedMeanRange[0]}–${seed.expectedMeanRange[1]}`,
      ok: r.inExpectedRange ? 'yes' : 'NO',
      radius: r.searchRadiusDeg,
    }
  }),
)

const output = {
  period: `${PERIOD.startDate}/${PERIOD.endDate}`,
  source: 'GloFAS v4 via Open-Meteo Flood API',
  stations: Object.fromEntries(results.map(({ id, ...rest }) => [id, rest])),
}
await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`)
console.log(`Wrote ${OUTPUT.pathname}`)

const failed = results.filter((r) => !r.inExpectedRange)
if (failed.length > 0) {
  console.error(`Outside the expected range: ${failed.map((r) => r.id).join(', ')}`)
  process.exitCode = 1
}
