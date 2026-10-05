import { describe, expect, it } from 'vitest'

import { anomalyPct, classifyDischarge } from '../src/lib/anomaly'
import type { NormDay } from '../src/types'

const norm: NormDay = { p10: 10, p25: 25, median: 50, p75: 75, p90: 90 }

describe('classifyDischarge', () => {
  it.each([
    [9.9, 'very-low'],
    [10, 'low'],
    [24.9, 'low'],
    [25, 'normal'],
    [75, 'normal'],
    [75.1, 'high'],
    [90, 'high'],
    [90.1, 'very-high'],
  ] as const)('classifies %s as %s, with p25 and p75 inside the normal band', (q, expected) => {
    expect(classifyDischarge(q, norm)).toBe(expected)
  })

  it('reports no-data when there is no value for today', () => {
    expect(classifyDischarge(null, norm)).toBe('no-data')
  })
})

describe('anomalyPct', () => {
  it('rounds the signed deviation from the median to whole percent', () => {
    expect(anomalyPct(56.2, 50)).toBe(12)
    expect(anomalyPct(32.6, 50)).toBe(-35)
  })

  it('returns plain 0, not −0, for a tiny negative deviation', () => {
    expect(Object.is(anomalyPct(49.9, 50), 0)).toBe(true)
  })

  it('is undefined without a value or with a zero median', () => {
    expect(anomalyPct(null, 50)).toBeNull()
    expect(anomalyPct(5, 0)).toBeNull()
  })
})
