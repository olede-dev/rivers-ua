function sortedCopy(values: readonly number[]): number[] {
  if (values.length === 0) throw new RangeError('Cannot compute a statistic of an empty sample')
  return [...values].sort((a, b) => a - b)
}

/** Linear interpolation between closest ranks, as `numpy.percentile` does by default. */
function percentileOfSorted(sorted: readonly number[], p: number): number {
  if (p < 0 || p > 100) throw new RangeError(`Percentile ${p} is outside 0..100`)
  const rank = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(rank)
  const upper = Math.ceil(rank)
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower)
}

export function percentile(values: readonly number[], p: number): number {
  return percentileOfSorted(sortedCopy(values), p)
}

/** Several percentiles of one sample, sorting it once. */
export function percentiles(values: readonly number[], ps: readonly number[]): number[] {
  const sorted = sortedCopy(values)
  return ps.map((p) => percentileOfSorted(sorted, p))
}

export function median(values: readonly number[]): number {
  return percentile(values, 50)
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError('Cannot compute a statistic of an empty sample')
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function nonNull(values: readonly (number | null)[]): number[] {
  return values.filter((v): v is number => v !== null)
}
