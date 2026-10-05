export type BasinId = 'dnipro' | 'dnister' | 'danube' | 'pivdennyi-buh' | 'don'

export interface Coordinates {
  lat: number
  lon: number
}

/** Hand-written station metadata with approximate coordinates, before validation. */
export interface StationSeed extends Coordinates {
  id: string
  river: string
  place: string
  basin: BasinId
  /** Pripyat, Desna and Upper Dnipro basins: the lab's forecasting focus. */
  focus: boolean
  /** Expected long-term mean discharge range, m³/s (order of magnitude). */
  expectedMeanRange: readonly [number, number]
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
