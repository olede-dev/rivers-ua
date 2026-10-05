import L from 'leaflet'

import { ANOMALY_CLASSES, NO_DATA_STROKE } from '../../config/anomalyClasses'
import type { Messages } from '../../i18n'

/** Below this width the legend starts collapsed so it does not cover southern markers. */
const EXPANDED_LEGEND_QUERY = '(min-width: 640px)'

/** Filled swatches carry the marker ring: white on the light map, dark on the dark one. */
function swatch(color: string | null): string {
  const [style, ring] = color
    ? [
        `background:${color};box-shadow:0 0 0 1px ${NO_DATA_STROKE}`,
        'border-[1.5px] border-white dark:border-slate-900',
      ]
    : [`border:2px solid ${NO_DATA_STROKE}`, '']
  return `<span class="inline-block size-3 shrink-0 rounded-full ${ring}" style="${style}"></span>`
}

export interface MapLegend {
  control: L.Control
  /** Rewrites the text in another language; the open or collapsed state stays. */
  setMessages(messages: Messages): void
}

/** Collapsible legend of the water-state classes, bottom-left of the map. */
export function createMapLegend(initial: Messages): MapLegend {
  const control = new L.Control({ position: 'bottomleft' })
  const element = L.DomUtil.create(
    'details',
    'rounded-md bg-white/95 dark:bg-slate-900/95 px-2 py-1.5 text-[11px] leading-tight shadow sm:px-3 sm:py-2 sm:text-xs',
  )
  element.open = window.matchMedia(EXPANDED_LEGEND_QUERY).matches
  L.DomEvent.disableClickPropagation(element)

  function setMessages(messages: Messages) {
    const rows = ANOMALY_CLASSES.map(
      (c) =>
        `<li class="flex items-center gap-2">${swatch(c.color)}${messages.anomalyClasses[c.id]}</li>`,
    ).join('')
    element.innerHTML = `<summary class="cursor-pointer font-semibold text-slate-900 dark:text-slate-100 focus-visible:outline-2 focus-visible:outline-sky-700 dark:focus-visible:outline-sky-400">${messages.map.legendTitle}</summary><ul class="mt-1 space-y-0.5 text-slate-700 dark:text-slate-300">${rows}</ul>`
  }

  setMessages(initial)
  control.onAdd = () => element
  return { control, setMessages }
}
