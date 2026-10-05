import type { Position } from './geometry'

const keyOf = (p: Position) => `${p[0]},${p[1]}`

/** Line ends that no other line touches: sources and mouths, the only candidate outlets. */
export function looseEnds(lines: readonly (readonly Position[])[]): Position[] {
  const degree = new Map<string, number>()
  for (const line of lines) {
    for (const end of [line[0], line.at(-1)!])
      degree.set(keyOf(end), (degree.get(keyOf(end)) ?? 0) + 1)
  }
  const ends = new Map<string, Position>()
  for (const line of lines) {
    for (const end of [line[0], line.at(-1)!])
      if (degree.get(keyOf(end)) === 1) ends.set(keyOf(end), end)
  }
  return [...ends.values()]
}

/**
 * Reverses lines so each runs downstream, ending towards its network's outlet. Lines join
 * where they share an endpoint exactly; in every connected network the loose end with the
 * lowest `elevation` (a key from `looseEnds`) is taken as the outlet — the sea, or the point
 * where the river leaves the clipped area. A line with no loose end anywhere keeps its order.
 */
export function orientDownstream(
  lines: readonly (readonly Position[])[],
  elevation: ReadonlyMap<string, number>,
): Position[][] {
  const result = lines.map((line) => [...line])
  const touching = new Map<string, number[]>()
  for (const [i, line] of lines.entries()) {
    for (const end of [line[0], line.at(-1)!]) {
      const key = keyOf(end)
      touching.set(key, [...(touching.get(key) ?? []), i])
    }
  }
  const otherEnd = (i: number, key: string) =>
    keyOf(lines[i][0]) === key ? keyOf(lines[i].at(-1)!) : keyOf(lines[i][0])

  const seen = new Set<number>()
  for (const start of lines.keys()) {
    if (seen.has(start)) continue
    // Collect the network, then pick its lowest loose end.
    const network: number[] = []
    const stack = [start]
    seen.add(start)
    while (stack.length > 0) {
      const i = stack.pop()!
      network.push(i)
      for (const end of [lines[i][0], lines[i].at(-1)!]) {
        for (const j of touching.get(keyOf(end))!) {
          if (!seen.has(j)) {
            seen.add(j)
            stack.push(j)
          }
        }
      }
    }
    let outlet: string | null = null
    for (const i of network) {
      for (const end of [lines[i][0], lines[i].at(-1)!]) {
        const height = elevation.get(keyOf(end))
        if (height !== undefined && (outlet === null || height < elevation.get(outlet)!)) {
          outlet = keyOf(end)
        }
      }
    }
    if (outlet === null) continue

    // Walk upstream from the outlet; every line reached through node `key` drains into it.
    const visited = new Set<number>()
    const queue = [outlet]
    while (queue.length > 0) {
      const key = queue.shift()!
      for (const i of touching.get(key)!) {
        if (visited.has(i)) continue
        visited.add(i)
        if (keyOf(result[i].at(-1)!) !== key) result[i].reverse()
        queue.push(otherEnd(i, key))
      }
    }
  }
  return result
}
