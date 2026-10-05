// Builds the climate-change indicators for every station from GloFAS reanalysis and
// writes public/data/climate.json: the mean discharge change between two 14-year periods
// and the low-flow days (below the p10 norm of public/data/norms.json) of every year.
// The calculations live in src/lib/climate.ts, shared with the app's tests.
import { readFile, writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

import { fetchDischargeHistory } from '../src/api/flood'
import { STATIONS } from '../src/config/stations'
import { lowFlowDaysByYear, meanChangePct } from '../src/lib/climate'
import type { ClimateFile, NormsFile, StationClimate } from '../src/types'
import { retryOnRateLimit } from './lib/rate-limit'

// The reanalysis behind Open-Meteo has values from 1997 only; earlier days are null.
const BASELINE = { from: 1997, to: 2010 }
const RECENT = { from: 2012, to: 2025 }
const YEARS = { from: BASELINE.from, to: RECENT.to }
/** July–October: the summer–autumn low-water season of Ukrainian rivers. */
const LOW_SEASON_MONTHS = [7, 8, 9, 10]
const PAUSE_MS = 300
const TIMEOUT_MS = 120_000
const NORMS = new URL('../public/data/norms.json', import.meta.url)
const OUTPUT = new URL('../public/data/climate.json', import.meta.url)

const norms = JSON.parse(await readFile(NORMS, 'utf8')) as NormsFile
const range = { startDate: `${YEARS.from}-01-01`, endDate: `${YEARS.to}-12-31` }

const stations: Record<string, StationClimate> = {}
for (const [i, station] of STATIONS.entries()) {
  const stationNorms = norms.stations[station.id]
  if (!stationNorms) throw new Error(`${station.id}: no norms; run npm run build:norms first`)
  if (i > 0) await sleep(PAUSE_MS)
  const [series] = await retryOnRateLimit(station.id, () =>
    fetchDischargeHistory([station], range, { timeoutMs: TIMEOUT_MS }),
  )
  const { time, discharge } = series
  stations[station.id] = {
    meanChangePct: meanChangePct(time, discharge, BASELINE, RECENT),
    lowSeasonChangePct: meanChangePct(time, discharge, BASELINE, RECENT, LOW_SEASON_MONTHS),
    lowFlowDays: lowFlowDaysByYear(time, discharge, stationNorms, YEARS),
  }
  const { meanChangePct: change, lowSeasonChangePct: lowSeason } = stations[station.id]
  console.log(`${station.id}: mean ${change}%, Jul–Oct ${lowSeason}%`)
}

const output: ClimateFile = {
  baseline: BASELINE,
  recent: RECENT,
  years: YEARS,
  source: 'GloFAS v4 reanalysis via Open-Meteo',
  stations,
}
await writeFile(OUTPUT, `${JSON.stringify(output)}\n`)
console.log(`Wrote ${OUTPUT.pathname}`)
