import { setTimeout as sleep } from 'node:timers/promises'

import { isRateLimited } from '../../src/api/http'

// Open-Meteo weights long history requests as many calls, so bulk scripts hit the
// per-minute limit. Only HTTP 429 is retried: waiting out the minute is the fix.
const MAX_ATTEMPTS = 5
const RATE_LIMIT_WAIT_MS = 65_000

export async function retryOnRateLimit<T>(label: string, call: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call()
    } catch (error) {
      if (!isRateLimited(error) || attempt === MAX_ATTEMPTS) throw error
      console.warn(
        `${label}: rate limited, waiting ${RATE_LIMIT_WAIT_MS / 1000} s (attempt ${attempt})`,
      )
      await sleep(RATE_LIMIT_WAIT_MS)
    }
  }
}
