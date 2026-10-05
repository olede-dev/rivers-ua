import L from 'leaflet'

import { ANOMALY_CLASSES, NO_DATA_STROKE } from '../../config/anomalyClasses'

/** Below this width the legend starts collapsed so it does not cover southern markers. */
const EXPANDED_LEGEND_QUERY = '(min-width: 640px)'

function swatch(color: string | null): string {
  const style = color
    ? `background:${color};border:1.5px solid #fff;box-shadow:0 0 0 1px ${NO_DATA_STROKE}`
    : `border:2px solid ${NO_DATA_STROKE}`
  return `<span class="inline-block size-3 shrink-0 rounded-full" style="${style}"></span>`
}

/** Collapsible legend of the water-state classes, bottom-left of the map. */
export function createMapLegend(): L.Control {
  const legend = new L.Control({ position: 'bottomleft' })
  legend.onAdd = () => {
    const element = L.DomUtil.create(
      'details',
      'rounded-md bg-white/95 px-2 py-1.5 text-[11px] leading-tight shadow sm:px-3 sm:py-2 sm:text-xs',
    )
    element.open = window.matchMedia(EXPANDED_LEGEND_QUERY).matches
    const rows = ANOMALY_CLASSES.map(
      (c) => `<li class="flex items-center gap-2">${swatch(c.color)}${c.label}</li>`,
    ).join('')
    element.innerHTML = `<summary class="cursor-pointer font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-700">Водність відносно норми</summary><ul class="mt-1 space-y-0.5 text-slate-700">${rows}</ul>`
    L.DomEvent.disableClickPropagation(element)
    return element
  }
  return legend
}
