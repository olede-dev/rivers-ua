/** What the map markers and river tints show; `state` is today's water state. */
export type MapLayer = 'state' | 'trend' | 'lowFlow'

export const MAP_LAYERS: readonly MapLayer[] = ['state', 'trend', 'lowFlow']

export type TrendClass = 'strong-decrease' | 'decrease' | 'stable' | 'increase' | 'strong-increase'
export type LowFlowClass = 'none' | 'few' | 'some' | 'many' | 'extreme'

export interface ClimateClassInfo<T extends string> {
  id: T
  color: string
  /** Inclusive upper bound of the class; the last class has none. */
  max: number | null
  /** Whether rivers near the station take the colour; the neutral class keeps the plain blue. */
  tint: boolean
}

/** Mean discharge change, %; ColorBrewer BrBG like the water-state classes, driest first. */
export const TREND_CLASSES: readonly ClimateClassInfo<TrendClass>[] = [
  { id: 'strong-decrease', color: '#a6611a', max: -30, tint: true },
  { id: 'decrease', color: '#dfc27d', max: -10, tint: true },
  { id: 'stable', color: '#c7c7c7', max: 10, tint: false },
  { id: 'increase', color: '#80cdc1', max: 30, tint: true },
  { id: 'strong-increase', color: '#018571', max: null, tint: true },
]

/** Low-flow days since 1 January; ColorBrewer YlOrBr, none first. */
export const LOW_FLOW_CLASSES: readonly ClimateClassInfo<LowFlowClass>[] = [
  { id: 'none', color: '#c7c7c7', max: 0, tint: false },
  { id: 'few', color: '#fee391', max: 14, tint: false },
  { id: 'some', color: '#fec44f', max: 44, tint: true },
  { id: 'many', color: '#ec7014', max: 89, tint: true },
  { id: 'extreme', color: '#8c2d04', max: null, tint: true },
]

/** The class whose range holds `value`; `null` stays unclassified. */
export function classify<T extends string>(
  classes: readonly ClimateClassInfo<T>[],
  value: number | null,
): ClimateClassInfo<T> | null {
  if (value === null) return null
  return classes.find((c) => c.max === null || value <= c.max) ?? null
}
