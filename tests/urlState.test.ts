import { describe, expect, it } from 'vitest'

import {
  DEFAULT_URL_STATE,
  parseUrlState,
  toUrlQuery,
  type QueryInput,
  type UrlState,
} from '../src/lib/urlState'
import type { BasinId } from '../src/types'

const basinIds: BasinId[] = ['dnipro', 'dnister']
const parse = (query: QueryInput) =>
  parseUrlState(query, { stationIds: ['dnipro-kyiv', 'desna-chernihiv'], basinIds })

describe('parseUrlState', () => {
  it('reads every shared field from the SPEC example URL', () => {
    expect(
      parse({ station: 'dnipro-kyiv', basin: 'dnipro', range: '90', mode: 'pct', precip: '1' }),
    ).toEqual({
      station: 'dnipro-kyiv',
      basin: 'dnipro',
      range: 90,
      mode: 'pct',
      precip: true,
      layer: 'state',
    })
  })

  it('falls back to defaults for unknown or malformed values', () => {
    expect(
      parse({
        station: 'tisza-chop',
        basin: 'volga',
        range: '45',
        mode: 'log',
        precip: 'yes',
        layer: 'rain',
      }),
    ).toEqual(DEFAULT_URL_STATE)
  })

  it('takes the first value when a key is repeated', () => {
    expect(parse({ range: ['30', '210'] }).range).toBe(30)
  })
})

describe('toUrlQuery', () => {
  it('omits defaults so the initial URL carries no query', () => {
    expect(toUrlQuery(DEFAULT_URL_STATE)).toEqual({})
  })

  it('round-trips a non-default state through parseUrlState', () => {
    const state: UrlState = {
      station: 'desna-chernihiv',
      basin: 'dnister',
      range: 210,
      mode: 'pct',
      precip: true,
      layer: 'lowFlow',
    }
    expect(parse(toUrlQuery(state))).toEqual(state)
  })
})
