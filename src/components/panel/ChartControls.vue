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
  <div class="flex flex-wrap items-center gap-2">
    <SegmentedControl v-model="ui.range" :label="t.chart.rangeLabel" :options="rangeOptions" />
    <SegmentedControl v-model="ui.mode" :label="t.chart.modeLabel" :options="modeOptions" />
    <button
      type="button"
      :aria-pressed="ui.showPrecip"
      class="inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium transition-colors focus-ring"
      :class="
        ui.showPrecip
          ? 'bg-accent text-white hover:bg-accent-hover'
          : 'bg-fill text-ink-muted hover:bg-fill-strong hover:text-ink'
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
