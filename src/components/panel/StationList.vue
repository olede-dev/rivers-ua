<script setup lang="ts">
import { computed, ref } from 'vue'

import { ANOMALY_CLASSES, ANOMALY_CLASS_INFO, NO_DATA_STROKE } from '../../config/anomalyClasses'
import { formatDischarge, formatPct } from '../../lib/format'
import { useUiStore } from '../../stores/ui'
import type { StationState } from '../../types'

const props = defineProps<{ states: readonly StationState[] }>()

type SortKey = 'name' | 'current' | 'pct' | 'class'
type SortDirection = 'asc' | 'desc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'pct', label: '% від норми' },
  { key: 'current', label: 'витратою' },
  { key: 'class', label: 'станом' },
  { key: 'name', label: 'назвою' },
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
      // Missing values sort last, like the other keys.
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

/** Names read A→Я by default; numbers start from the largest. */
function onSortKeyChange() {
  sortDirection.value = sortKey.value === 'name' ? 'asc' : 'desc'
}

function toggleDirection() {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

function dotStyle(state: StationState): Record<string, string> {
  const color = state.anomalyClass ? ANOMALY_CLASS_INFO[state.anomalyClass].color : null
  return color ? { background: color } : { border: `2px solid ${NO_DATA_STROKE}` }
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2 text-sm text-slate-600">
      <label for="station-sort">Сортувати за</label>
      <select
        id="station-sort"
        v-model="sortKey"
        class="min-w-0 rounded-md border border-slate-300 bg-white py-1 pr-7 pl-2 text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
        @change="onSortKeyChange"
      >
        <option v-for="option in SORT_OPTIONS" :key="option.key" :value="option.key">
          {{ option.label }}
        </option>
      </select>
      <button
        type="button"
        class="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
        :aria-label="sortDirection === 'asc' ? 'За зростанням' : 'За спаданням'"
        :title="sortDirection === 'asc' ? 'За зростанням' : 'За спаданням'"
        @click="toggleDirection"
      >
        <span aria-hidden="true">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
      </button>
    </div>

    <ul class="-mx-2" aria-label="Станції та стан водності на сьогодні">
      <li v-for="state in rows" :key="state.station.id">
        <button
          type="button"
          :aria-current="ui.selectedId === state.station.id ? 'true' : undefined"
          class="flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-700"
          :class="{ 'bg-sky-50 hover:bg-sky-50': ui.selectedId === state.station.id }"
          @click="ui.selectStation(state.station.id)"
        >
          <span class="mt-1.5 size-2.5 shrink-0 rounded-full" :style="dotStyle(state)"></span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm leading-snug">
              <span class="font-medium text-slate-900">{{ state.station.river }}</span>
              <span class="text-slate-600"> — {{ state.station.place }}</span>
            </span>
            <span
              class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600"
            >
              <span>{{
                state.anomalyClass ? ANOMALY_CLASS_INFO[state.anomalyClass].label : 'Стан невідомий'
              }}</span>
              <span v-if="state.station.focus" class="rounded bg-sky-100 px-1.5 text-sky-900">
                фокусний басейн
              </span>
            </span>
          </span>
          <span class="shrink-0 text-right tabular-nums">
            <span class="block text-sm leading-snug font-semibold text-slate-900">
              {{ formatPct(state.anomalyPct) }}
            </span>
            <span class="mt-0.5 block text-xs whitespace-nowrap text-slate-600">
              {{ formatDischarge(state.current) }} м³/с
            </span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
