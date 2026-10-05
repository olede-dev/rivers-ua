import { describe, expect, it } from 'vitest'

import { assignRiverReach } from '../src/lib/riverReach'

describe('assignRiverReach', () => {
  // Two lines joined at [1, 0]; ≈111 km per segment along the equator.
  const lines = [
    [
      [0, 0],
      [1, 0],
    ],
    [
      [1, 0],
      [2, 0],
      [3, 0],
    ],
  ]

  it('follows joined lines and splits between sources at the midpoint', () => {
    const reach = assignRiverReach(
      lines,
      [
        { id: 'a', position: [0, 0.01] },
        { id: 'b', position: [3, 0] },
      ],
      1000,
      5,
    )
    expect(reach.map((line) => line.map((r) => r?.id))).toEqual([['a'], ['a', 'b']])
  })

  it('leaves segments beyond the reach and unsnapped sources empty', () => {
    const reach = assignRiverReach(
      lines,
      [
        { id: 'a', position: [0, 0] },
        { id: 'far', position: [2, 1] },
      ],
      150,
      5,
    )
    expect(reach.map((line) => line.map((r) => r?.id ?? null))).toEqual([['a'], [null, null]])
    expect(reach[0][0]!.km).toBeCloseTo(55.7, 0)
  })
})
