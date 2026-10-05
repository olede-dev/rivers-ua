import { describe, expect, it } from 'vitest'

import { mean, median, percentile, percentiles } from '../src/lib/stats'

describe('percentile', () => {
  // Expected values match numpy.percentile([1, 2, 3, 4], p) with linear interpolation.
  it.each([
    [0, 1],
    [25, 1.75],
    [50, 2.5],
    [90, 3.7],
    [100, 4],
  ])('p%i of an unsorted sample is %f', (p, expected) => {
    expect(percentile([4, 1, 3, 2], p)).toBeCloseTo(expected, 10)
  })

  it('returns the only value of a one-element sample', () => {
    expect(percentile([5], 90)).toBe(5)
  })

  it('does not reorder the caller’s array', () => {
    const values = [3, 1, 2]
    percentile(values, 50)
    expect(values).toEqual([3, 1, 2])
  })

  it('rejects an empty sample and a percentile outside 0..100', () => {
    expect(() => percentile([], 50)).toThrow(RangeError)
    expect(() => percentile([1], 101)).toThrow(RangeError)
  })
})

describe('percentiles', () => {
  it('matches single percentile calls', () => {
    expect(percentiles([10, 20, 30, 40, 50], [10, 50, 90])).toEqual([14, 30, 46])
  })
})

describe('median and mean', () => {
  it('handle odd and even sample sizes', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(mean([1, 2, 3, 6])).toBe(3)
  })
})
