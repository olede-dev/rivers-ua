// Downloads today's discharge and ensemble forecast for every station once and writes
// public/data/discharge-snapshot.json. The app falls back to it when Open-Meteo refuses
// or fails (for example after the daily rate limit). CI runs it before every build.
import { writeFile } from 'node:fs/promises'

import type { DischargeSnapshotFile } from '../src/api/discharge'
import { fetchDischarge } from '../src/api/flood'
import { DISCHARGE_WINDOW, SNAPSHOT_PATH } from '../src/config/discharge'
import { STATIONS } from '../src/config/stations'
import { todayKyiv } from '../src/lib/dates'

const TIMEOUT_MS = 60_000
const OUTPUT = new URL(`../public/${SNAPSHOT_PATH}`, import.meta.url)

const series = await fetchDischarge(STATIONS, DISCHARGE_WINDOW, { timeoutMs: TIMEOUT_MS })
const output: DischargeSnapshotFile = {
  fetchedOn: todayKyiv(),
  window: DISCHARGE_WINDOW,
  stations: Object.fromEntries(series),
}
await writeFile(OUTPUT, `${JSON.stringify(output)}\n`)
console.log(`Wrote ${series.size} stations to ${OUTPUT.pathname}`)
