<script setup lang="ts">
import { useUiStore, type ChartMode, type ChartRange } from '../../stores/ui'
import SegmentedControl from '../ui/SegmentedControl.vue'

const ui = useUiStore()

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: 30, label: '30 днів' },
  { value: 90, label: '3 місяці' },
  { value: 210, label: '7 місяців' },
]
const MODE_OPTIONS: { value: ChartMode; label: string }[] = [
  { value: 'abs', label: 'м³/с' },
  { value: 'pct', label: '% від норми' },
]
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
    <SegmentedControl v-model="ui.range" label="Горизонт прогнозу" :options="RANGE_OPTIONS" />
    <SegmentedControl v-model="ui.mode" label="Одиниці графіка" :options="MODE_OPTIONS" />
  </div>
</template>
