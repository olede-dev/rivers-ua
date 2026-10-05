import { describe, expect, it } from 'vitest'

import { formatDischarge, formatPct } from '../src/lib/format'

// uk-UA groups thousands with a no-break space and uses a decimal comma.
const NBSP = ' '

describe('formatDischarge', () => {
  it('groups thousands and drops decimals from 10 m³/s up', () => {
    expect(formatDischarge(1234.5)).toBe(`1${NBSP}235`)
  })

  it('keeps one decimal below 10 m³/s', () => {
    expect(formatDischarge(4.25)).toBe('4,3')
  })
})

describe('formatPct', () => {
  it('signs deviations with a plus or a typographic minus', () => {
    expect(formatPct(12)).toBe('+12%')
    expect(formatPct(-35)).toBe('−35%')
    expect(formatPct(0)).toBe('0%')
  })
})
