export type BasinId = 'dnipro' | 'dnister' | 'danube' | 'pivdennyi-buh' | 'don'

export interface Coordinates {
  lat: number
  lon: number
}

/** Hand-written station metadata with approximate coordinates, before validation. */
/** River and the town or village the station is named after. */
export interface StationName {
  river: string
  place: string
}

export interface StationSeed extends Coordinates, StationName {
  id: string
  /** English name; `river` and `place` themselves are Ukrainian. */
  en: StationName
  basin: BasinId
  /** Pripyat, Desna and Upper Dnipro basins: the lab's forecasting focus. */
  focus: boolean
  /** Expected long-term mean discharge range, m³/s (order of magnitude). */
  expectedMeanRange: readonly [number, number]
  /** Map position on the river line; data is still queried at `lat`/`lon`. */
  marker: Coordinates
}

/** A station whose coordinates passed `scripts/validate-stations.ts`. */
export type Station = Omit<StationSeed, 'expectedMeanRange'>

/** Daily values aligned by index with `time` (`YYYY-MM-DD`); `null` means no value. */
export type DailyValues = (number | null)[]

export interface HistorySeries {
  /** Centre of the GloFAS cell the API resolved the query to. */
  cell: Coordinates
  time: string[]
  discharge: DailyValues
}

export interface DischargeSeries extends HistorySeries {
  /** Ensemble statistics; `null` for past dates. */
  ensemble: {
    median: DailyValues
    min: DailyValues
    max: DailyValues
    p25: DailyValues
    p75: DailyValues
  }
}

export interface NormDay {
  p10: number
  p25: number
  median: number
  p75: number
  p90: number
}

export interface StationNorms {
  meanAnnual: number
  /** 365 entries; index 0 is 1 January. */
  doy: NormDay[]
}

export interface NormsFile {
  period: string
  smoothingWindowDays: number
  source: string
  stations: Record<string, StationNorms>
}

export type AnomalyClass = 'very-low' | 'low' | 'normal' | 'high' | 'very-high' | 'no-data'

/** A station joined with today's discharge and norm, as the map and list display it. */
export interface StationState {
  station: Station
  /** Centre of the GloFAS cell; `null` until discharge has loaded. */
  cell: Coordinates | null
  /** Discharge for today in Kyiv, m³/s. */
  current: number | null
  /** Norm for today's day of year; `null` when norms are unavailable. */
  norm: NormDay | null
  meanAnnual: number | null
  /** `null` when norms are unavailable, so no class can be assigned. */
  anomalyClass: AnomalyClass | null
  /** Signed whole percent deviation from the median norm. */
  anomalyPct: number | null
}
