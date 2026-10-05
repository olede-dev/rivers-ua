<script setup lang="ts">
import 'chartjs-adapter-date-fns'

import {
  BarController,
  BarElement,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
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
import { enGB } from 'date-fns/locale/en-GB'
import { uk } from 'date-fns/locale/uk'
import { computed } from 'vue'
import { Chart } from 'vue-chartjs'

import { useLocale } from '../../composables/useLocale'
import { useTheme } from '../../composables/useTheme'
import type { Locale } from '../../i18n'
import { type ChartSeries, valueAxisMax } from '../../lib/chartSeries'
import { formatDischarge, formatPctOfNorm, formatPrecipitation } from '../../lib/format'
import type { DailyValues } from '../../types'

// Only the pieces this chart uses, so the rest of Chart.js is tree-shaken away.
ChartJS.register(
  LineController,
  LineElement,
  BarController,
  BarElement,
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

const PALETTES = {
  light: {
    norm: '#64748b',
    normBand: 'rgba(100, 116, 139, 0.15)',
    forecast: '#2563eb',
    forecastOuter: 'rgba(37, 99, 235, 0.12)',
    forecastInner: 'rgba(37, 99, 235, 0.25)',
    past: '#1e3a8a',
    precipitation: 'rgba(13, 148, 136, 0.75)',
    today: '#0f172a',
    todayText: '#ffffff',
    text: '#475569',
    grid: 'rgba(15, 23, 42, 0.1)',
  },
  dark: {
    norm: '#94a3b8',
    normBand: 'rgba(148, 163, 184, 0.18)',
    forecast: '#60a5fa',
    forecastOuter: 'rgba(96, 165, 250, 0.14)',
    forecastInner: 'rgba(96, 165, 250, 0.3)',
    past: '#e0f2fe',
    precipitation: 'rgba(45, 212, 191, 0.7)',
    today: '#e2e8f0',
    todayText: '#0f172a',
    text: '#cbd5e1',
    grid: 'rgba(226, 232, 240, 0.12)',
  },
}

const DATE_LOCALES = { uk, en: enGB } satisfies Record<Locale, unknown>

const { isDark } = useTheme()
const { locale, t } = useLocale()
const colors = computed(() => (isDark.value ? PALETTES.dark : PALETTES.light))

/** Typed for the mixed chart: line datasets plus the precipitation bars. */
type Dataset = ChartDataset<'line' | 'bar', DailyValues>

/** A band is drawn by an invisible lower line and an upper line filled down to it. */
interface Band {
  label: string
  lower: DailyValues
  upper: DailyValues
  fill: string
}

const formatValue = (value: number | null) =>
  props.relative
    ? formatPctOfNorm(value, locale.value)
    : `${formatDischarge(value, locale.value)} ${t.value.dischargeUnit}`

function line(label: string, data: DailyValues, style: Partial<Dataset>): Dataset {
  return { label, data, pointRadius: 0, pointHoverRadius: 3, borderWidth: 1.5, ...style }
}

const chart = computed(() => {
  const { series, relative } = props
  const COLORS = colors.value
  const labels = t.value.chart
  const bands: Band[] = []
  const lines: Dataset[] = []

  // Listed bottom to top; datasets are reversed below because Chart.js draws index 0 last.
  if (series.norm) {
    bands.push({
      label: labels.normBand,
      lower: series.norm.p25,
      upper: series.norm.p75,
      fill: COLORS.normBand,
    })
  }
  bands.push(
    {
      label: labels.forecastSpread,
      lower: series.forecast.min,
      upper: series.forecast.max,
      fill: COLORS.forecastOuter,
    },
    {
      label: labels.forecastIqr,
      lower: series.forecast.p25,
      upper: series.forecast.p75,
      fill: COLORS.forecastInner,
    },
  )
  if (series.norm) {
    lines.push(
      line(relative ? labels.normRelative : labels.normMedian, series.norm.median, {
        borderColor: COLORS.norm,
        borderDash: [5, 4],
      }),
    )
  }
  lines.push(
    line(labels.forecastMedian, series.forecast.median, {
      borderColor: COLORS.forecast,
      borderDash: [6, 3],
      borderWidth: 2,
    }),
    line(labels.past, series.past, { borderColor: COLORS.past, borderWidth: 2 }),
  )

  // Top-most first. Each band upper line is followed by its lower line and fills to it.
  const datasets: Dataset[] = []
  const lowerIndices = new Set<number>()
  for (const dataset of [...lines].reverse()) datasets.push(dataset)
  // Bars go between the lines and the bands: drawn over the translucent bands, under the lines.
  const precipitationIndex = series.precipitation ? datasets.length : null
  if (series.precipitation) {
    datasets.push({
      type: 'bar',
      label: labels.precipitation,
      data: series.precipitation,
      yAxisID: 'y2',
      backgroundColor: COLORS.precipitation,
      barPercentage: 0.8,
      categoryPercentage: 1,
    })
  }
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

  const data: ChartData<'line' | 'bar', DailyValues, string> = { labels: series.time, datasets }
  return { data, lowerIndices, precipitationIndex }
})

function tooltipLabel(item: TooltipItem<'line' | 'bar'>): string {
  const { datasetIndex, dataIndex, dataset } = item
  const { lowerIndices, precipitationIndex } = chart.value
  const value = dataset.data[dataIndex] as number | null
  if (datasetIndex === precipitationIndex) {
    return `${dataset.label}: ${formatPrecipitation(value, locale.value)} ${t.value.chart.precipitationUnit}`
  }
  if (lowerIndices.has(datasetIndex + 1)) {
    const lower = chart.value.data.datasets[datasetIndex + 1].data[dataIndex]
    return `${dataset.label}: ${formatValue(lower)} … ${formatValue(value)}`
  }
  return `${dataset.label}: ${formatValue(value)}`
}

const options = computed((): ChartOptions<'line' | 'bar'> => {
  const { lowerIndices, precipitationIndex } = chart.value
  const COLORS = colors.value
  return {
    color: COLORS.text,
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    spanGaps: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        type: 'time',
        adapters: { date: { locale: DATE_LOCALES[locale.value] } },
        time: {
          minUnit: 'day',
          tooltipFormat: 'd MMMM yyyy',
          displayFormats: { day: 'd MMM', week: 'd MMM', month: 'd MMM' },
        },
        // Bars would otherwise pad the axis by half a day and shift the lines off the edges.
        offset: false,
        ticks: { maxRotation: 0, autoSkipPadding: 12, color: COLORS.text },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        max: valueAxisMax(props.series) ?? undefined,
        title: {
          display: true,
          text: props.relative ? t.value.chart.pctOfNorm : t.value.chart.dischargeAxis,
          color: COLORS.text,
        },
        grid: { color: COLORS.grid },
        border: { color: COLORS.grid },
        ticks: {
          color: COLORS.text,
          callback: (value) =>
            props.relative ? `${value}%` : formatDischarge(+value, locale.value),
        },
      },
      y2: {
        display: precipitationIndex !== null,
        position: 'right',
        min: 0,
        title: { display: true, text: t.value.chart.precipitationAxis, color: COLORS.text },
        grid: { drawOnChartArea: false },
        border: { color: COLORS.grid },
        ticks: {
          color: COLORS.text,
          callback: (value) => formatPrecipitation(+value, locale.value),
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: COLORS.text,
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
              content: t.value.chart.today,
              position: 'start',
              backgroundColor: COLORS.today,
              color: COLORS.todayText,
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
    <Chart
      type="line"
      :data="chart.data"
      :options="options"
      :aria-label="t.chart.ariaLabel"
      role="img"
    />
  </div>
</template>
