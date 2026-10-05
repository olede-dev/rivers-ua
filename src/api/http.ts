export type ErrorCategory =
  'Validation' | 'NotFound' | 'Conflict' | 'Forbidden' | 'Upstream' | 'Internal'

export class AppError extends Error {
  readonly category: ErrorCategory
  readonly code: string
  readonly details?: Record<string, unknown>

  constructor(options: {
    category: ErrorCategory
    code: string
    message: string
    details?: Record<string, unknown>
    cause?: unknown
  }) {
    super(options.message, { cause: options.cause })
    this.name = 'AppError'
    this.category = options.category
    this.code = options.code
    this.details = options.details
  }
}

/** Interactive page requests; scripts pass a longer budget for bulk history. */
export const DEFAULT_TIMEOUT_MS = 15_000

export interface RequestOptions {
  timeoutMs?: number
  signal?: AbortSignal
}

function readReason(body: unknown): string | undefined {
  if (typeof body === 'object' && body !== null && 'reason' in body) {
    return typeof body.reason === 'string' ? body.reason : undefined
  }
  return undefined
}

/**
 * GET a JSON document. Open-Meteo reports errors as `{ error: true, reason }`
 * with HTTP 400; every failure surfaces as an `Upstream` AppError.
 */
export async function getJson(url: URL, options: RequestOptions = {}): Promise<unknown> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal } = options
  const timeout = AbortSignal.timeout(timeoutMs)
  const details = { url: url.toString() }

  let response: Response
  try {
    response = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
  } catch (cause) {
    if (timeout.aborted) {
      throw new AppError({
        category: 'Upstream',
        code: 'upstream_timeout',
        message: `Request timed out after ${timeoutMs} ms`,
        details,
        cause,
      })
    }
    if (signal?.aborted) throw cause
    throw new AppError({
      category: 'Upstream',
      code: 'upstream_unreachable',
      message: 'Request failed before a response arrived',
      details,
      cause,
    })
  }

  let body: unknown
  try {
    body = await response.json()
  } catch (cause) {
    throw new AppError({
      category: 'Upstream',
      code: response.ok ? 'upstream_invalid_response' : 'upstream_rejected',
      message: `Response is not valid JSON (HTTP ${response.status})`,
      details: { ...details, status: response.status },
      cause,
    })
  }

  if (!response.ok) {
    throw new AppError({
      category: 'Upstream',
      code: 'upstream_rejected',
      message: `Upstream responded with HTTP ${response.status}`,
      details: { ...details, status: response.status, reason: readReason(body) },
    })
  }
  return body
}
