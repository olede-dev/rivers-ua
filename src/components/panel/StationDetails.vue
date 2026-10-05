<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue'

import { BASIN_LABELS } from '../../config/basins'
import { buildChartSeries } from '../../lib/chartSeries'
import { formatCoordinates, formatDischarge, formatPct } from '../../lib/format'
import { useUiStore, type ChartRange } from '../../stores/ui'
import type { DischargeSeries, StationNorms, StationState } from '../../types'
import AnomalyBadge from '../ui/AnomalyBadge.vue'
import ErrorState from '../ui/ErrorState.vue'
import LoadingSkeleton from '../ui/LoadingSkeleton.vue'
import ChartControls from './ChartControls.vue'
import DischargeChart from './DischargeChart.vue'
import StatCard from './StatCard.vue'

const props = defineProps<{
  state: StationState
  /** `undefined` while discharge is loading or after it failed. */
  series: DischargeSeries | undefined
  norms: StationNorms | null
  today: string
  /** Status of the discharge query `series` comes from. */
  status: 'pending' | 'error' | 'success'
}>()
defineEmits<{ retry: [] }>()

/** The short period shows 30 past days; the longer ones show 60, all the data request holds. */
const PAST_DAYS: Record<ChartRange, number> = { 30: 30, 90: 60, 210: 60 }

const ui = useUiStore()
const heading = useTemplateRef<HTMLHeadingElement>('heading')

/** Relative mode needs a median norm to divide by; without norms the chart stays in m³/s. */
const relative = computed(() => ui.mode === 'pct' && props.norms !== null)

const chartSeries = computed(
  () =>
    props.series &&
    buildChartSeries(props.series, props.norms, {
      today: props.today,
      pastDays: PAST_DAYS[ui.range],
      forecastDays: ui.range,
      relative: relative.value,
    }),
)

// The panel replaces the list in place; move focus so keyboard and screen-reader users follow.
onMounted(() => heading.value?.focus())
</script>

<template>
  <article class="space-y-4">
    <button
      type="button"
      class="rounded text-sm text-sky-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
      @click="ui.selectStation(null)"
    >
      ← До списку
    </button>

    <header>
      <h2
        ref="heading"
        tabindex="-1"
        class="text-lg font-semibold text-slate-900 focus-visible:outline-none"
      >
        {{ state.station.river }} — {{ state.station.place }}
      </h2>
      <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
        <span>Басейн: {{ BASIN_LABELS[state.station.basin] }}</span>
        <span v-if="state.station.focus" class="rounded bg-sky-100 px-1.5 text-[11px] text-sky-900">
          фокусний басейн
        </span>
      </p>
      <p v-if="state.cell" class="mt-0.5 text-xs text-slate-500">
        Комірка GloFAS: {{ formatCoordinates(state.cell) }}
      </p>
    </header>

    <dl class="grid grid-cols-3 gap-2">
      <StatCard label="Зараз" :value="formatDischarge(state.current)" unit="м³/с" />
      <StatCard
        label="Норма на сьогодні"
        :value="formatDischarge(state.norm?.median ?? null)"
        unit="м³/с"
      />
      <StatCard label="Відхилення" :value="formatPct(state.anomalyPct)">
        <AnomalyBadge v-if="state.anomalyClass" :anomaly-class="state.anomalyClass" />
      </StatCard>
    </dl>

    <section class="space-y-3" aria-labelledby="chart-heading">
      <h3 id="chart-heading" class="text-sm font-semibold text-slate-900">
        Витрати і прогноз GloFAS
      </h3>
      <ChartControls />
      <p v-if="ui.mode === 'pct' && !norms" class="text-xs text-slate-600">
        Норми не завантажилися — графік показано в м³/с.
      </p>
      <LoadingSkeleton
        v-if="status === 'pending'"
        label="Завантаження графіка…"
        class="h-[260px] lg:h-80"
      />
      <ErrorState
        v-else-if="status === 'error'"
        message="Не вдалося завантажити дані Open-Meteo."
        @retry="$emit('retry')"
      />
      <DischargeChart
        v-else-if="chartSeries"
        :series="chartSeries"
        :today="today"
        :relative="relative"
      />
      <div
        v-else
        class="flex h-[260px] items-center justify-center rounded bg-slate-100 text-sm text-slate-500 lg:h-80"
      >
        Немає даних для графіка
      </div>
      <p class="text-xs text-slate-500">
        Прогноз — ансамбль GloFAS: медіана, міжквартильний діапазон (p25–p75) і повний розкид
        (min–max). Норма — 1991–2020 для того самого дня року.
      </p>
    </section>
  </article>
</template>
