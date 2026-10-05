import type { DischargeWindow } from '../api/flood'

/** Past window for the chart's longest period plus the full 7-month ensemble forecast. */
export const DISCHARGE_WINDOW: DischargeWindow = { pastDays: 60, forecastDays: 210 }

/** GloFAS updates once a day; within an hour a reload reuses the stored response. */
export const DISCHARGE_MAX_AGE_MS = 60 * 60 * 1000

/** Fallback built by `npm run build:snapshot`, served next to the app. */
export const SNAPSHOT_PATH = 'data/discharge-snapshot.json'
