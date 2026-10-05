<script setup lang="ts">
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'

import { useLocale } from '../../composables/useLocale'
import { useTheme } from '../../composables/useTheme'
import type { YearCount, YearRange } from '../../lib/climate'

ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, annotationPlugin)

const props = defineProps<{
  byYear: readonly YearCount[]
  recent: YearRange
  currentYear: number
  /** Mean over the baseline period, drawn as a dashed reference line. */
  baselineMean: number | null
}>()

const PALETTES = {
  light: {
    past: '#d6c3a5',
    recent: '#ec7014',
    current: '#8c2d04',
    reference: '#475569',
    text: '#475569',
    grid: 'rgba(15, 23, 42, 0.1)',
  },
  dark: {
    past: '#6b5b45',
    recent: '#f59e0b',
    current: '#fdba74',
    reference: '#cbd5e1',
    text: '#cbd5e1',
    grid: 'rgba(226, 232, 240, 0.12)',
  },
}

const { isDark } = useTheme()
const { t } = useLocale()
const colors = computed(() => (isDark.value ? PALETTES.dark : PALETTES.light))

function barColor(year: number): string {
  if (year === props.currentYear) return colors.value.current
  return year >= props.recent.from && year <= props.recent.to
    ? colors.value.recent
    : colors.value.past
}

const data = computed((): ChartData<'bar', number[], string> => ({
  labels: props.byYear.map((c) => String(c.year)),
  datasets: [
    {
      data: props.byYear.map((c) => c.days),
      backgroundColor: props.byYear.map((c) => barColor(c.year)),
      barPercentage: 0.85,
      categoryPercentage: 1,
    },
  ],
}))

const options = computed((): ChartOptions<'bar'> => {
  const COLORS = colors.value
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
        ticks: { color: COLORS.text, maxRotation: 0, autoSkipPadding: 8 },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: COLORS.text, precision: 0 },
        grid: { color: COLORS.grid },
        border: { color: COLORS.grid },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (item) => t.value.climate.days(item.raw as number) },
      },
      annotation: {
        annotations:
          props.baselineMean === null
            ? {}
            : {
                baseline: {
                  type: 'line',
                  scaleID: 'y',
                  value: props.baselineMean,
                  borderColor: COLORS.reference,
                  borderWidth: 1,
                  borderDash: [4, 4],
                },
              },
      },
    },
  }
})
</script>

<template>
  <div class="h-44">
    <Bar :data="data" :options="options" :aria-label="t.climate.chartAria" role="img" />
  </div>
</template>
