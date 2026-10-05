import type { BasinId } from '../types'

export const BASINS: readonly { id: BasinId; label: string }[] = [
  { id: 'dnipro', label: 'Дніпро' },
  { id: 'dnister', label: 'Дністер' },
  { id: 'danube', label: 'Дунай' },
  { id: 'pivdennyi-buh', label: 'Південний Буг' },
  { id: 'don', label: 'Дон' },
]

export const BASIN_LABELS = Object.fromEntries(BASINS.map((b) => [b.id, b.label])) as Record<
  BasinId,
  string
>
