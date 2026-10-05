import type { Position } from './geometry'

/** Kilometres per degree of latitude; longitude is scaled by cos(latitude). */
const KM_PER_DEGREE = 111.32

export interface ReachSource {
  id: string
  /** `[lon, lat]`. */
  position: Position
}

/** Nearest source along the river network for one segment, or `null` when none is in reach. */
export interface SegmentReach {
  id: string
  /** Network distance from the source to the segment midpoint, km. */
  km: number
}

function km(a: Position, b: Position): number {
  const cos = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180)
  return Math.hypot((b[0] - a[0]) * cos, b[1] - a[1]) * KM_PER_DEGREE
}

/** Squared planar distance from `p` to segment a→b and the projection parameter. */
function project(p: Position, a: Position, b: Position): { d: number; t: number } {
  const cos = Math.cos((p[1] * Math.PI) / 180)
  const dx = (b[0] - a[0]) * cos
  const dy = b[1] - a[1]
  const px = (p[0] - a[0]) * cos
  const py = p[1] - a[1]
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSq))
  return { d: (px - t * dx) ** 2 + (py - t * dy) ** 2, t }
}

/** Min-heap of `[distance, node, source]`. */
class Heap {
  private items: [number, number, number][] = []
  get size() {
    return this.items.length
  }
  push(item: [number, number, number]) {
    const items = this.items
    items.push(item)
    let i = items.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (items[parent][0] <= items[i][0]) break
      ;[items[parent], items[i]] = [items[i], items[parent]]
      i = parent
    }
  }
  pop(): [number, number, number] {
    const items = this.items
    const top = items[0]
    const last = items.pop()!
    if (items.length > 0) {
      items[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < items.length && items[l][0] < items[m][0]) m = l
        if (r < items.length && items[r][0] < items[m][0]) m = r
        if (m === i) break
        ;[items[m], items[i]] = [items[i], items[m]]
        i = m
      }
    }
    return top
  }
}

/**
 * Assigns every segment of `lines` to the nearest source along the river network. Lines join
 * where they share an endpoint coordinate exactly (the river file is rounded, so they do).
 * Each source snaps to its nearest segment; sources farther than `snapKm` from any line and
 * segments farther than `maxKm` from every source get `null`.
 * The result mirrors `lines`: one entry per segment (`line.length - 1` per line).
 */
export function assignRiverReach(
  lines: readonly (readonly Position[])[],
  sources: readonly ReachSource[],
  maxKm: number,
  snapKm: number,
): (SegmentReach | null)[][] {
  const nodeIds = new Map<string, number>()
  const nodes: Position[] = []
  const nodeOf = (p: Position) => {
    const key = `${p[0]},${p[1]}`
    let id = nodeIds.get(key)
    if (id === undefined) {
      id = nodes.length
      nodeIds.set(key, id)
      nodes.push(p)
    }
    return id
  }
  const lineNodes = lines.map((line) => line.map(nodeOf))
  const adjacency: [number, number][][] = nodes.map(() => [])
  for (const ids of lineNodes) {
    for (let i = 1; i < ids.length; i++) {
      const length = km(nodes[ids[i - 1]], nodes[ids[i]])
      adjacency[ids[i - 1]].push([ids[i], length])
      adjacency[ids[i]].push([ids[i - 1], length])
    }
  }

  const distance = new Float64Array(nodes.length).fill(Infinity)
  const owner = new Int32Array(nodes.length).fill(-1)
  const heap = new Heap()
  const snapDegSq = (snapKm / KM_PER_DEGREE) ** 2
  sources.forEach((source, s) => {
    let best: { d: number; t: number; a: Position; b: Position; ia: number; ib: number } | null =
      null
    for (const [l, line] of lines.entries()) {
      for (let i = 1; i < line.length; i++) {
        const hit = project(source.position, line[i - 1], line[i])
        if (hit.d <= snapDegSq && (!best || hit.d < best.d)) {
          best = {
            ...hit,
            a: line[i - 1],
            b: line[i],
            ia: lineNodes[l][i - 1],
            ib: lineNodes[l][i],
          }
        }
      }
    }
    if (!best) return
    const length = km(best.a, best.b)
    heap.push([best.t * length, best.ia, s])
    heap.push([(1 - best.t) * length, best.ib, s])
  })
  while (heap.size > 0) {
    const [d, node, s] = heap.pop()
    if (d >= distance[node] || d > maxKm) continue
    distance[node] = d
    owner[node] = s
    for (const [next, length] of adjacency[node]) {
      if (d + length < distance[next]) heap.push([d + length, next, s])
    }
  }

  return lineNodes.map((ids) => {
    const reach: (SegmentReach | null)[] = []
    for (let i = 1; i < ids.length; i++) {
      const [a, b] = [ids[i - 1], ids[i]]
      const near = distance[a] <= distance[b] ? a : b
      const mid = Math.min(distance[a], distance[b]) + km(nodes[a], nodes[b]) / 2
      reach.push(
        owner[near] === -1 || mid > maxKm ? null : { id: sources[owner[near]].id, km: mid },
      )
    }
    return reach
  })
}
