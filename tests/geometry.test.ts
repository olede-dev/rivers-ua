import { describe, expect, it } from 'vitest'

import {
  clipLineToBox,
  clipLineToRings,
  insideRings,
  roundLine,
  simplifyLine,
  type BBox,
  type Position,
} from '../src/lib/geometry'

const BOX: BBox = [0, 0, 10, 10]

describe('clipLineToBox', () => {
  it('keeps one outside point on each side of a run', () => {
    const line: Position[] = [
      [-5, 5],
      [-1, 5],
      [5, 5],
      [11, 5],
      [15, 5],
    ]
    expect(clipLineToBox(line, BOX)).toEqual([
      [
        [-1, 5],
        [5, 5],
        [11, 5],
      ],
    ])
  })

  it('splits a line that leaves and re-enters the box', () => {
    const line: Position[] = [
      [5, 5],
      [5, 12],
      [5, 20],
      [5, 30],
      [6, 9],
    ]
    expect(clipLineToBox(line, BOX)).toEqual([
      [
        [5, 5],
        [5, 12],
      ],
      [
        [5, 30],
        [6, 9],
      ],
    ])
  })

  it('drops a line entirely outside the box', () => {
    expect(
      clipLineToBox(
        [
          [20, 20],
          [30, 30],
        ],
        BOX,
      ),
    ).toEqual([])
  })
})

describe('simplifyLine', () => {
  it('drops points closer to the chord than the tolerance', () => {
    const line: Position[] = [
      [0, 0],
      [1, 0.01],
      [2, -0.01],
      [3, 0],
    ]
    expect(simplifyLine(line, 0.1)).toEqual([
      [0, 0],
      [3, 0],
    ])
  })

  it('keeps a corner farther than the tolerance', () => {
    const line: Position[] = [
      [0, 0],
      [1, 1.01],
      [2, 2],
      [3, 0.99],
      [4, 0],
    ]
    expect(simplifyLine(line, 0.1)).toEqual([
      [0, 0],
      [2, 2],
      [4, 0],
    ])
  })

  it('returns short lines unchanged', () => {
    expect(
      simplifyLine(
        [
          [0, 0],
          [1, 1],
        ],
        10,
      ),
    ).toEqual([
      [0, 0],
      [1, 1],
    ])
  })
})

describe('roundLine', () => {
  it('rounds coordinates and removes duplicates that appear after rounding', () => {
    const line: Position[] = [
      [1.0001, 2.0004],
      [1.0004, 2.0001],
      [1.2345, 2.3456],
    ]
    expect(roundLine(line, 3)).toEqual([
      [1, 2],
      [1.235, 2.346],
    ])
  })
})

const SQUARE: Position[] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
]

describe('insideRings', () => {
  it('treats a ring nested in another as a hole', () => {
    const hole: Position[] = [
      [4, 4],
      [6, 4],
      [6, 6],
      [4, 6],
      [4, 4],
    ]
    expect(insideRings([2, 2], [SQUARE, hole])).toBe(true)
    expect(insideRings([5, 5], [SQUARE, hole])).toBe(false)
  })
})

describe('clipLineToRings', () => {
  it('cuts a crossing line exactly at the boundary', () => {
    const line: Position[] = [
      [-5, 5],
      [5, 5],
      [15, 5],
    ]
    expect(clipLineToRings(line, [SQUARE], 0)).toEqual([
      [
        [0, 5],
        [5, 5],
        [10, 5],
      ],
    ])
  })

  it('splits a line that leaves the polygon and comes back', () => {
    const line: Position[] = [
      [5, 5],
      [5, 15],
      [8, 5],
    ]
    expect(clipLineToRings(line, [SQUARE], 0)).toEqual([
      [
        [5, 5],
        [5, 10],
      ],
      [
        [6.5, 10],
        [8, 5],
      ],
    ])
  })

  it('keeps a piece running just outside the boundary within the tolerance', () => {
    const line: Position[] = [
      [2, -0.1],
      [8, -0.1],
    ]
    expect(clipLineToRings(line, [SQUARE], 0.2)).toEqual([line])
    expect(clipLineToRings(line, [SQUARE], 0.05)).toEqual([])
  })
})
