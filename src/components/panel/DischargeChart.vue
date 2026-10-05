<script setup lang="ts">
import 'chartjs-adapter-date-fns'

import {
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip,
  type ChartData,
  type ChartDataset,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { uk } from 'date-fns/locale/uk'
import { computed } from 'vue'
import { Line } from 'vue-chartjs'

import { type ChartSeries, valueAxisMax } from '../../lib/chartSeries'
import { formatDischarge, formatPctOfNorm } from '../../lib/format'
import type { DailyValues } from '../../types'

// Only the pieces this chart uses, so the rest of Chart.js is tree-shaken away.
ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Filler,
  Tooltip,
  Legend,
  annotationPlugin,
)

const props = defineProps<{
  series: ChartSeries
  today: string
  /** Values are % of the median norm instead of m³/s. */
  relative: boolean
}>()

const COLORS = {
  norm: '#64748b',
  normBand: 'rgba(100, 116, 139, 0.15)',
  forecast: '#2563eb',
  forecastOuter: 'rgba(37, 99, 235, 0.12)',
  forecastInner: 'rgba(37, 99, 235, 0.25)',
  past: '#1e3a8a',
  today: '#0f172a',
}

type LineDataset = ChartDataset<'line', DailyValues>

/** A band is drawn by an invisible lower line and an upper line filled down to it. */
interface Band {
  label: string
  lower: DailyValues
  upper: DailyValues
  fill: string
}

const formatValue = (value: number | null) =>
  props.relative ? formatPctOfNorm(value) : `${formatDischarge(value)} м³/с`

function line(label: string, data: DailyValues, style: Partial<LineDataset>): LineDataset {
  return { label, data, pointRadius: 0, pointHoverRadius: 3, borderWidth: 1.5, ...style }
}

const chart = computed(() => {
  const { series, relative } = props
  const bands: Band[] = []
  const lines: LineDataset[] = []

  // Listed bottom to top; datasets are reversed below because Chart.js draws index 0 last.
  if (series.norm) {
    bands.push({
      label: 'Норма p25–p75',
      lower: series.norm.p25,
      upper: series.norm.p75,
      fill: COLORS.normBand,
    })
  }
  bands.push(
    {
      label: 'Прогноз min–max',
      lower: series.forecast.min,
      upper: series.forecast.max,
      fill: COLORS.forecastOuter,
    },
    {
      label: 'Прогноз p25–p75',
      lower: series.forecast.p25,
      upper: series.forecast.p75,
      fill: COLORS.forecastInner,
    },
  )
  if (series.norm) {
    lines.push(
      line(relative ? 'Норма (100%)' : 'Норма (медіана)', series.norm.median, {
        borderColor: COLORS.norm,
        borderDash: [5, 4],
      }),
    )
  }
  lines.push(
    line('Прогноз (медіана ансамблю)', series.forecast.median, {
      borderColor: COLORS.forecast,
      borderDash: [6, 3],
      borderWidth: 2,
    }),
    line('Минулі значення (модель)', series.past, { borderColor: COLORS.past, borderWidth: 2 }),
  )

  // Top-most first. Each band upper line is followed by its lower line and fills to it.
  const datasets: LineDataset[] = []
  const lowerIndices = new Set<number>()
  for (const dataset of [...lines].reverse()) datasets.push(dataset)
  for (const band of [...bands].reverse()) {
    const upperIndex = datasets.length
    datasets.push(
      line(band.label, band.upper, {
        borderWidth: 0,
        backgroundColor: band.fill,
        fill: { target: upperIndex + 1 },
      }),
      line(band.label, band.lower, { borderWidth: 0, pointHoverRadius: 0 }),
    )
    lowerIndices.add(upperIndex + 1)
  }

  const data: ChartData<'line', DailyValues, string> = { labels: series.time, datasets }
  return { data, lowerIndices }
})

function tooltipLabel(item: TooltipItem<'line'>): string {
  const { datasetIndex, dataIndex, dataset } = item
  const lowerIndices = chart.value.lowerIndices
  const value = dataset.data[dataIndex] as number | null
  if (lowerIndices.has(datasetIndex + 1)) {
    const lower = chart.value.data.datasets[datasetIndex + 1].data[dataIndex]
    return `${dataset.label}: ${formatValue(lower)} … ${formatValue(value)}`
  }
  return `${dataset.label}: ${formatValue(value)}`
}

const options = computed((): ChartOptions<'line'> => {
  const { lowerIndices } = chart.value
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    spanGaps: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        type: 'time',
        adapters: { date: { locale: uk } },
        time: {
          minUnit: 'day',
          tooltipFormat: 'd MMMM yyyy',
          displayFormats: { day: 'd MMM', week: 'd MMM', month: 'd MMM' },
        },
        ticks: { maxRotation: 0, autoSkipPadding: 12 },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        max: valueAxisMax(props.series) ?? undefined,
        title: { display: true, text: props.relative ? '% від норми' : 'Витрата води, м³/с' },
        ticks: { callback: (value) => (props.relative ? `${value}%` : formatDischarge(+value)) },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 14,
          boxHeight: 8,
          filter: (item) => item.datasetIndex === undefined || !lowerIndices.has(item.datasetIndex),
        },
      },
      tooltip: {
        filter: (item) => !lowerIndices.has(item.datasetIndex) && item.raw !== null,
        callbacks: { label: tooltipLabel },
      },
      annotation: {
        annotations: {
          today: {
            type: 'line',
            scaleID: 'x',
            value: props.today,
            borderColor: COLORS.today,
            borderWidth: 1,
            borderDash: [3, 3],
            label: {
              display: true,
              content: 'Сьогодні',
              position: 'start',
              backgroundColor: COLORS.today,
              font: { size: 11 },
              padding: 3,
            },
          },
        },
      },
    },
  }
})
</script>

<template>
  <div class="h-[260px] lg:h-80">
    <Line
      :data="chart.data"
      :options="options"
      aria-label="Графік витрат води: минулі значення, прогноз ансамблю і норма"
      role="img"
    />
  </div>
</template>
