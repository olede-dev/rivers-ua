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
  </div>
</template>
