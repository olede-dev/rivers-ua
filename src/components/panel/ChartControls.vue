<script setup lang="ts">
import { computed } from 'vue'

import { useLocale } from '../../composables/useLocale'
import { useUiStore, type ChartMode, type ChartRange } from '../../stores/ui'
import SegmentedControl from '../ui/SegmentedControl.vue'

const ui = useUiStore()
const { t } = useLocale()

const RANGES: readonly ChartRange[] = [30, 90, 210]
const rangeOptions = computed(() =>
  RANGES.map((value) => ({ value, label: t.value.chart.ranges[value] })),
)
const modeOptions = computed((): { value: ChartMode; label: string }[] => [
  { value: 'abs', label: t.value.dischargeUnit },
  { value: 'pct', label: t.value.chart.pctOfNorm },
])
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
    <SegmentedControl v-model="ui.range" :label="t.chart.rangeLabel" :options="rangeOptions" />
    <SegmentedControl v-model="ui.mode" :label="t.chart.modeLabel" :options="modeOptions" />
    <button
      type="button"
      :aria-pressed="ui.showPrecip"
      class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-sky-700 dark:focus-visible:outline-sky-400"
      :class="
        ui.showPrecip
          ? 'border-sky-800 dark:border-sky-700 bg-sky-800 dark:bg-sky-700 text-white shadow-sm'
          : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
      "
      @click="ui.showPrecip = !ui.showPrecip"
    >
      <svg viewBox="0 0 24 24" class="size-4" aria-hidden="true" fill="none" stroke="currentColor">
        <path
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9a4 4 0 0 1 0 8M9 21l1-2M13 21l1-2M17 21l1-2"
        />
      </svg>
      {{ t.chart.precipitationToggle }}
    </button>
  </div>
</template>
