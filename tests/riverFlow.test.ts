import { describe, expect, it } from 'vitest'

import type { Position } from '../src/lib/geometry'
import { looseEnds, orientDownstream } from '../src/lib/riverFlow'

describe('orientDownstream', () => {
  // A main river [0,0]–[2,0] with a tributary joining at [1,0]; all drawn the wrong way.
  const lines: Position[][] = [
    [
      [1, 0],
      [0, 0],
    ],
    [
      [2, 0],
      [1, 0],
    ],
    [
      [1, 0],
      [1, 1],
    ],
  ]

  it('lists the ends no other line touches', () => {
    expect(looseEnds(lines)).toEqual([
      [0, 0],
      [2, 0],
      [1, 1],
    ])
  })

  it('points every line towards the lowest loose end', () => {
    const elevation = new Map([
      ['0,0', 120],
      ['2,0', 5],
      ['1,1', 200],
    ])
    expect(orientDownstream(lines, elevation)).toEqual([
      [
        [0, 0],
        [1, 0],
      ],
      [
        [1, 0],
        [2, 0],
      ],
      [
        [1, 1],
        [1, 0],
      ],
    ])
  })
})
