import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchDischargeHistory } from '../src/api/flood'
import { AppError, getJson } from '../src/api/http'

const URL_UNDER_TEST = new URL('https://flood-api.open-meteo.com/v1/flood')

function stubFetch(body: unknown, status = 200) {
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify(body), { status }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getJson', () => {
  it('turns an Open-Meteo error body into an Upstream error carrying the reason', async () => {
    stubFetch({ error: true, reason: 'Parameter forecast_days must be between 0 and 210' }, 400)
    const error = await getJson(URL_UNDER_TEST).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({
      category: 'Upstream',
      code: 'upstream_rejected',
      details: { status: 400, reason: 'Parameter forecast_days must be between 0 and 210' },
    })
  })

  it('reports a timeout when the server does not answer in time', async () => {
    vi.stubGlobal(
      'fetch',
      (_url: URL, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason))
        }),
    )
    await expect(getJson(URL_UNDER_TEST, { timeoutMs: 10 })).rejects.toMatchObject({
      code: 'upstream_timeout',
    })
  })
})

describe('fetchDischargeHistory', () => {
  const location = (latitude: number) => ({
    latitude,
    longitude: 30.575,
    daily: { time: ['2020-01-01', '2020-01-02'], river_discharge: [1.5, null] },
  })

  it('accepts the single-object response returned for one location', async () => {
    stubFetch(location(50.475))
    const [series] = await fetchDischargeHistory([{ lat: 50.45, lon: 30.57 }], {
      startDate: '2020-01-01',
      endDate: '2020-01-02',
    })
    expect(series).toEqual({
      cell: { lat: 50.475, lon: 30.575 },
      time: ['2020-01-01', '2020-01-02'],
      discharge: [1.5, null],
    })
  })

  it('keeps the request order for several locations', async () => {
    stubFetch([location(1), location(2)])
    const series = await fetchDischargeHistory(
      [
        { lat: 1, lon: 30 },
        { lat: 2, lon: 30 },
      ],
      { startDate: '2020-01-01', endDate: '2020-01-02' },
    )
    expect(series.map((s) => s.cell.lat)).toEqual([1, 2])
  })

  it('rejects a response with a different number of locations', async () => {
    stubFetch([location(1)])
    await expect(
      fetchDischargeHistory(
        [
          { lat: 1, lon: 30 },
          { lat: 2, lon: 30 },
        ],
        { startDate: '2020-01-01', endDate: '2020-01-02' },
      ),
    ).rejects.toMatchObject({ code: 'upstream_invalid_response' })
  })
})
