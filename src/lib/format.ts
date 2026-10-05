import type { Coordinates } from '../types'

const LOCALE = 'uk-UA'
const MINUS = '−'

const largeNumber = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const smallNumber = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 })

/** Discharge in m³/s without the unit: whole numbers from 10 up, one decimal below. */
export function formatDischarge(value: number | null): string {
  if (value === null) return '—'
  return (Math.abs(value) >= 10 ? largeNumber : smallNumber).format(value)
}

/** Signed percent with a typographic minus: `+12%`, `−35%`, `0%`. */
export function formatPct(value: number | null): string {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : value < 0 ? MINUS : ''
  return `${sign}${largeNumber.format(Math.abs(value))}%`
}

/** Share of the norm, unsigned and whole: `115%`. */
export function formatPctOfNorm(value: number | null): string {
  if (value === null) return '—'
  return `${largeNumber.format(value)}%`
}

const coordinate = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
})

/** Geographic position with hemispheres in Ukrainian: `50,475° пн. ш., 30,525° сх. д.`. */
export function formatCoordinates({ lat, lon }: Coordinates): string {
  const latitude = `${coordinate.format(Math.abs(lat))}° ${lat < 0 ? 'пд.' : 'пн.'} ш.`
  const longitude = `${coordinate.format(Math.abs(lon))}° ${lon < 0 ? 'зх.' : 'сх.'} д.`
  return `${latitude}, ${longitude}`
}
