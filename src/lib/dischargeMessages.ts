import type { DischargeSource } from '../api/discharge'
import { isRateLimited } from '../api/http'
import { formatPlainDate } from './format'

/** What to tell the user when discharge could not be loaded at all. */
export function dischargeErrorMessage(error: unknown): string {
  return isRateLimited(error)
    ? 'Ліміт запитів до Open-Meteo вичерпано. Спробуйте пізніше.'
    : 'Не вдалося завантажити дані Open-Meteo.'
}

/** Notice above the page while the snapshot stands in for live data; `null` for live data. */
export function snapshotNotice(source: DischargeSource | undefined): string | null {
  if (source?.kind !== 'snapshot') return null
  const cause =
    source.reason === 'rate_limited'
      ? 'ліміт запитів до Open-Meteo вичерпано'
      : 'Open-Meteo недоступний'
  return `Зараз ${cause} — показано збережені дані від ${formatPlainDate(source.fetchedOn)}`
}
