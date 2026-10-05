/** `[lon, lat]`, the GeoJSON coordinate order; extra elements (altitude) are ignored. */
export type Position = number[]

/** `[west, south, east, north]` in degrees. */
export type BBox = readonly [number, number, number, number]

function insideBox([lon, lat]: Position, [west, south, east, north]: BBox): boolean {
  return lon >= west && lon <= east && lat >= south && lat <= north
}

/**
 * Splits a line into the runs that touch the box. Each run keeps one point beyond the box
 * on either side, so clipped lines still reach the box edge instead of stopping short.
 */
export function clipLineToBox(line: readonly Position[], box: BBox): Position[][] {
  const runs: Position[][] = []
  let run: Position[] = []
  for (let i = 0; i < line.length; i++) {
    const keep =
      insideBox(line[i], box) ||
      (i > 0 && insideBox(line[i - 1], box)) ||
      (i < line.length - 1 && insideBox(line[i + 1], box))
    if (keep) {
      run.push(line[i])
    } else if (run.length > 0) {
      runs.push(run)
      run = []
    }
  }
  if (run.length > 0) runs.push(run)
  return runs.filter((r) => r.length >= 2)
}

function distanceToSegment([x, y]: Position, [x1, y1]: Position, [x2, y2]: Position): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSq = dx * dx + dy * dy
  const t =
    lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSq))
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
}

/** Douglas–Peucker simplification; `tolerance` is in degrees. Endpoints are always kept. */
export function simplifyLine(line: readonly Position[], tolerance: number): Position[] {
  if (line.length <= 2) return [...line]
  const keep = new Uint8Array(line.length)
  keep[0] = 1
  keep[line.length - 1] = 1
  const stack: [number, number][] = [[0, line.length - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop()!
    let farthest = -1
    let maxDistance = tolerance
    for (let i = first + 1; i < last; i++) {
      const distance = distanceToSegment(line[i], line[first], line[last])
      if (distance > maxDistance) {
        maxDistance = distance
        farthest = i
      }
    }
    if (farthest !== -1) {
      keep[farthest] = 1
      stack.push([first, farthest], [farthest, last])
    }
  }
  return line.filter((_, i) => keep[i] === 1)
}

/** Rounds to `digits` decimals and drops points that collapse onto their predecessor. */
export function roundLine(line: readonly Position[], digits: number): Position[] {
  const factor = 10 ** digits
  const rounded: Position[] = []
  for (const [lon, lat] of line) {
    const point = [Math.round(lon * factor) / factor, Math.round(lat * factor) / factor]
    const previous = rounded.at(-1)
    if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) rounded.push(point)
  }
  return rounded
}

/** Even–odd rule over every ring, so holes and separate islands both work. */
export function insideRings([x, y]: Position, rings: readonly (readonly Position[])[]): boolean {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
  }
  return inside
}

function distanceToRings(point: Position, rings: readonly (readonly Position[])[]): number {
  let min = Infinity
  for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) {
      min = Math.min(min, distanceToSegment(point, ring[i - 1], ring[i]))
    }
  }
  return min
}

/** Parameters `t` in (0, 1) where segment a→b crosses a ring edge, ascending. */
function crossings(a: Position, b: Position, rings: readonly (readonly Position[])[]): number[] {
  const [ax, ay] = a
  const rx = b[0] - ax
  const ry = b[1] - ay
  const ts: number[] = []
  for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) {
      const [cx, cy] = ring[i - 1]
      const sx = ring[i][0] - cx
      const sy = ring[i][1] - cy
      const denominator = rx * sy - ry * sx
      if (denominator === 0) continue
      const t = ((cx - ax) * sy - (cy - ay) * sx) / denominator
      const u = ((cx - ax) * ry - (cy - ay) * rx) / denominator
      if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t)
    }
  }
  return ts.sort((p, q) => p - q)
}

/**
 * Cuts a line at the polygon boundary and keeps the pieces inside it. A piece outside is
 * still kept when both its ends lie within `borderTolerance` of the boundary: rivers that
 * form the border (the Danube, the Prut) run beside the border line rather than on it.
 */
export function clipLineToRings(
  line: readonly Position[],
  rings: readonly (readonly Position[])[],
  borderTolerance: number,
): Position[][] {
  const runs: Position[][] = []
  let run: Position[] = []
  const nearBorder = (p: Position) => distanceToRings(p, rings) <= borderTolerance
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]
    const b = line[i]
    const cuts = [0, ...crossings(a, b, rings), 1]
    for (let k = 1; k < cuts.length; k++) {
      const at = (t: number): Position => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
      const start = at(cuts[k - 1])
      const end = at(cuts[k])
      const middle = at((cuts[k - 1] + cuts[k]) / 2)
      const keep = insideRings(middle, rings) || (nearBorder(start) && nearBorder(end))
      if (keep) {
        if (run.length === 0) run.push(start)
        run.push(end)
      } else if (run.length > 0) {
        runs.push(run)
        run = []
      }
    }
  }
  if (run.length > 0) runs.push(run)
  return runs.filter((r) => r.length >= 2)
}
