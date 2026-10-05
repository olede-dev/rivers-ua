import type { DischargeSource } from '../api/discharge'
import { isRateLimited } from '../api/http'
import { MESSAGES, type Locale } from '../i18n'
import { formatPlainDate } from './format'

/** What to tell the user when discharge could not be loaded at all. */
export function dischargeErrorMessage(error: unknown, locale: Locale): string {
  const { errors } = MESSAGES[locale]
  return isRateLimited(error) ? errors.rateLimited : errors.loadFailed
}

/** Notice above the page while the snapshot stands in for live data; `null` for live data. */
export function snapshotNotice(source: DischargeSource | undefined, locale: Locale): string | null {
  if (source?.kind !== 'snapshot') return null
  const { errors } = MESSAGES[locale]
  const cause =
    source.reason === 'rate_limited' ? errors.snapshotRateLimited : errors.snapshotUnavailable
  return errors.snapshotNotice(cause, formatPlainDate(source.fetchedOn, locale))
}
