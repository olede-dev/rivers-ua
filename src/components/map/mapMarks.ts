import { ANOMALY_CLASSES, ANOMALY_CLASS_INFO } from '../../config/anomalyClasses'
import {
  classify,
  LOW_FLOW_CLASSES,
  TREND_CLASSES,
  type MapLayer,
} from '../../config/climateClasses'
import type { Locale, Messages } from '../../i18n'
import type { ClimateSummary } from '../../lib/climate'
import { formatPct, formatYearRange } from '../../lib/format'
import type { ClimateFile, StationState } from '../../types'

/** How one station looks on the map in the current layer. */
export interface MapMark {
  /** Marker fill; `null` draws an outline only (no data). */
  fill: string | null
  /** Colour of the river reach around the station; `null` keeps the plain river colour. */
  tint: string | null
  /** Strong anomalies pulse; only the water-state layer uses it. */
  pulse: boolean
  /** Layer value for the tooltip, already formatted. */
  detail: string | null
}

export interface LegendRow {
  color: string | null
  label: string
}

export interface LegendContent {
  title: string
  rows: LegendRow[]
  /** Small print under the rows, e.g. the periods compared. */
  note?: string
}

/** Fill while the layer's value is not known yet (norms or climate data missing). */
export const UNCLASSIFIED_FILL = '#94a3b8'
/** Deviation from the median norm, in percent, from which a station pulses. */
const PULSE_PCT = 50

function stateMark({ anomalyClass, anomalyPct }: StationState, locale: Locale): MapMark {
  if (!anomalyClass) {
    return { fill: UNCLASSIFIED_FILL, tint: null, pulse: false, detail: null }
  }
  const color = ANOMALY_CLASS_INFO[anomalyClass].color
  return {
    fill: color,
    tint: anomalyClass === 'normal' ? null : color,
    pulse: color !== null && anomalyPct !== null && Math.abs(anomalyPct) >= PULSE_PCT,
    detail: anomalyPct === null ? null : formatPct(anomalyPct, locale),
  }
}

function climateMark(
  layer: 'trend' | 'lowFlow',
  summary: ClimateSummary | undefined,
  locale: Locale,
  t: Messages,
): MapMark {
  const value = layer === 'trend' ? (summary?.meanChangePct ?? null) : (summary?.thisYear ?? null)
  const info = classify(layer === 'trend' ? TREND_CLASSES : LOW_FLOW_CLASSES, value)
  if (!info || value === null) {
    return { fill: UNCLASSIFIED_FILL, tint: null, pulse: false, detail: null }
  }
  return {
    fill: info.color,
    tint: info.tint ? info.color : null,
    pulse: false,
    detail:
      layer === 'trend' ? t.climate.trendTooltip(formatPct(value, locale)) : t.climate.days(value),
  }
}

export function mapMarks(
  layer: MapLayer,
  states: readonly StationState[],
  summaries: ReadonlyMap<string, ClimateSummary>,
  locale: Locale,
  t: Messages,
): Map<string, MapMark> {
  return new Map(
    states.map((state) => {
      const id = state.station.id
      const mark =
        layer === 'state'
          ? stateMark(state, locale)
          : climateMark(layer, summaries.get(id), locale, t)
      return [id, mark]
    }),
  )
}

export function legendContent(
  layer: MapLayer,
  t: Messages,
  climate: ClimateFile | undefined,
): LegendContent {
  if (layer === 'trend') {
    return {
      title: t.climate.trendLegend,
      rows: TREND_CLASSES.map((c) => ({ color: c.color, label: t.climate.trendClasses[c.id] })),
      note:
        climate &&
        t.climate.trendNote(formatYearRange(climate.recent), formatYearRange(climate.baseline)),
    }
  }
  if (layer === 'lowFlow') {
    return {
      title: t.climate.lowFlowLegend,
      rows: LOW_FLOW_CLASSES.map((c) => ({
        color: c.color,
        label: t.climate.lowFlowClasses[c.id],
      })),
      note: t.climate.lowFlowNote,
    }
  }
  return {
    title: t.map.legendTitle,
    rows: ANOMALY_CLASSES.map((c) => ({ color: c.color, label: t.anomalyClasses[c.id] })),
  }
}
