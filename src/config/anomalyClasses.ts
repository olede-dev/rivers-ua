import type { AnomalyClass } from '../types'

export interface AnomalyClassInfo {
  id: AnomalyClass
  label: string
  /** ColorBrewer BrBG, colour-blind safe; `null` draws an outline only. */
  color: string | null
}

/** Ordered from driest to wettest, then no data; the legend and sorting follow this order. */
export const ANOMALY_CLASSES: readonly AnomalyClassInfo[] = [
  { id: 'very-low', label: 'Дуже низька водність', color: '#a6611a' },
  { id: 'low', label: 'Низька водність', color: '#dfc27d' },
  { id: 'normal', label: 'Близько до норми', color: '#c7c7c7' },
  { id: 'high', label: 'Підвищена водність', color: '#80cdc1' },
  { id: 'very-high', label: 'Висока водність', color: '#018571' },
  { id: 'no-data', label: 'Немає даних', color: null },
]

export const ANOMALY_CLASS_INFO = Object.fromEntries(
  ANOMALY_CLASSES.map((c) => [c.id, c]),
) as Record<AnomalyClass, AnomalyClassInfo>

/** Outline for markers and dots, also the stroke of the no-data class. */
export const NO_DATA_STROKE = '#64748b'
