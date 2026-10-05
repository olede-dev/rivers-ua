// Builds the 1991–2020 day-of-year discharge climatology for every station from
// GloFAS reanalysis and writes public/data/norms.json. The calculation itself
// lives in src/lib/norms.ts, shared with the app's tests.
import { writeFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'

import { fetchDischargeHistory } from '../src/api/flood'
import { STATIONS } from '../src/config/stations'
import { NORM_SMOOTHING_WINDOW_DAYS, computeNorms } from '../src/lib/norms'
import type { NormsFile, StationNorms } from '../src/types'
import { retryOnRateLimit } from './lib/rate-limit'

// WMO standard climatological normal.
const PERIOD = { startDate: '1991-01-01', endDate: '2020-12-31' }
const PAUSE_MS = 300
const TIMEOUT_MS = 120_000
const OUTPUT = new URL('../public/data/norms.json', import.meta.url)

const stations: Record<string, StationNorms> = {}
for (const [i, station] of STATIONS.entries()) {
  if (i > 0) await sleep(PAUSE_MS)
  const [series] = await retryOnRateLimit(station.id, () =>
    fetchDischargeHistory([station], PERIOD, { timeoutMs: TIMEOUT_MS }),
  )
  stations[station.id] = computeNorms(series.time, series.discharge)
  console.log(`${station.id}: mean ${stations[station.id].meanAnnual} m³/s`)
}

const output: NormsFile = {
  period: '1991-2020',
  smoothingWindowDays: NORM_SMOOTHING_WINDOW_DAYS,
  source: 'GloFAS v4 reanalysis via Open-Meteo',
  stations,
}
await writeFile(OUTPUT, `${JSON.stringify(output)}\n`)
console.log(`Wrote ${OUTPUT.pathname}`)
