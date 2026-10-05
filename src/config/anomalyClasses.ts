import type { AnomalyClass } from '../types'

export interface AnomalyClassInfo {
  id: AnomalyClass
  /** ColorBrewer BrBG, colour-blind safe; `null` draws an outline only. */
  color: string | null
}

/**
 * Ordered from driest to wettest, then no data; the legend and sorting follow this order.
 * Names live in the locale messages under `anomalyClasses`.
 */
export const ANOMALY_CLASSES: readonly AnomalyClassInfo[] = [
  { id: 'very-low', color: '#a6611a' },
  { id: 'low', color: '#dfc27d' },
  { id: 'normal', color: '#c7c7c7' },
  { id: 'high', color: '#80cdc1' },
  { id: 'very-high', color: '#018571' },
  { id: 'no-data', color: null },
]

export const ANOMALY_CLASS_INFO = Object.fromEntries(
  ANOMALY_CLASSES.map((c) => [c.id, c]),
) as Record<AnomalyClass, AnomalyClassInfo>

/** Outline for markers and dots, also the stroke of the no-data class. */
export const NO_DATA_STROKE = '#64748b'
