<script setup lang="ts">
import { computed, ref } from 'vue'

import { ANOMALY_CLASSES, ANOMALY_CLASS_INFO, NO_DATA_STROKE } from '../../config/anomalyClasses'
import { formatDischarge, formatPct } from '../../lib/format'
import { useUiStore } from '../../stores/ui'
import type { StationState } from '../../types'

const props = defineProps<{ states: readonly StationState[] }>()

type SortKey = 'name' | 'current' | 'pct' | 'class'
type SortDirection = 'asc' | 'desc'

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'name', label: 'Річка / пункт', numeric: false },
  { key: 'current', label: 'Витрата, м³/с', numeric: true },
  { key: 'pct', label: '% від норми', numeric: true },
  { key: 'class', label: 'Стан', numeric: false },
]

const ui = useUiStore()
const sortKey = ref<SortKey>('pct')
const sortDirection = ref<SortDirection>('desc')

const nameCollator = new Intl.Collator('uk')

function sortValue(state: StationState, key: SortKey): string | number | null {
  switch (key) {
    case 'name':
      return `${state.station.river} ${state.station.place}`
    case 'current':
      return state.current
    case 'pct':
      return state.anomalyPct
    case 'class':
      // Missing values sort last, like the other columns.
      return state.anomalyClass && state.anomalyClass !== 'no-data'
        ? ANOMALY_CLASSES.findIndex((c) => c.id === state.anomalyClass)
        : null
  }
}

/** Compares two sort values; missing values always go last, whatever the direction. */
function compare(a: string | number | null, b: string | number | null, sign: number): number {
  if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1
  if (typeof a === 'string' && typeof b === 'string') return sign * nameCollator.compare(a, b)
  return sign * (Number(a) - Number(b))
}

const rows = computed(() => {
  const sign = sortDirection.value === 'asc' ? 1 : -1
  return props.states
    .filter((s) => ui.basin === 'all' || s.station.basin === ui.basin)
    .sort((a, b) => compare(sortValue(a, sortKey.value), sortValue(b, sortKey.value), sign))
})

function sortBy(key: SortKey) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDirection.value = key === 'name' ? 'asc' : 'desc'
  }
}

function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sortKey.value !== key) return 'none'
  return sortDirection.value === 'asc' ? 'ascending' : 'descending'
}

function dotStyle(state: StationState): Record<string, string> {
  const color = state.anomalyClass ? ANOMALY_CLASS_INFO[state.anomalyClass].color : null
  return color ? { background: color } : { border: `2px solid ${NO_DATA_STROKE}` }
}
</script>

<template>
  <table class="w-full border-collapse text-sm">
    <caption class="sr-only">
      Станції та стан водності на сьогодні. Рядок відкриває станцію.
    </caption>
    <thead>
      <tr class="border-b border-slate-200 text-left text-xs text-slate-600">
        <th
          v-for="column in COLUMNS"
          :key="column.key"
          scope="col"
          :aria-sort="ariaSort(column.key)"
          class="py-2 font-medium"
          :class="column.numeric ? 'pr-3 text-right' : 'pr-2'"
        >
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-700"
            @click="sortBy(column.key)"
          >
            {{ column.label }}
            <span aria-hidden="true" class="w-2">
              {{ sortKey === column.key ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}
            </span>
          </button>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="state in rows"
        :key="state.station.id"
        tabindex="0"
        :aria-current="ui.selectedId === state.station.id ? 'true' : undefined"
        class="cursor-pointer border-b border-slate-100 hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-700"
        :class="{ 'bg-sky-50 hover:bg-sky-50': ui.selectedId === state.station.id }"
        @click="ui.selectStation(state.station.id)"
        @keydown.enter.prevent="ui.selectStation(state.station.id)"
        @keydown.space.prevent="ui.selectStation(state.station.id)"
      >
        <td class="py-2 pr-2">
          <span class="font-medium text-slate-900">{{ state.station.river }}</span>
          <span class="text-slate-600"> — {{ state.station.place }}</span>
          <span
            v-if="state.station.focus"
            class="mt-0.5 block w-fit rounded bg-sky-100 px-1.5 text-[11px] text-sky-900"
          >
            фокусний басейн
          </span>
        </td>
        <td class="py-2 pr-3 text-right tabular-nums">{{ formatDischarge(state.current) }}</td>
        <td class="py-2 pr-3 text-right tabular-nums">{{ formatPct(state.anomalyPct) }}</td>
        <td class="py-2">
          <span v-if="state.anomalyClass" class="flex items-center gap-1.5">
            <span class="size-2.5 shrink-0 rounded-full" :style="dotStyle(state)"></span>
            <span class="text-xs leading-tight text-slate-700">
              {{ ANOMALY_CLASS_INFO[state.anomalyClass].label }}
            </span>
          </span>
          <span v-else class="text-slate-500">—</span>
        </td>
      </tr>
    </tbody>
  </table>
</template>
