<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue'

import { isRateLimited } from '../../api/http'
import { useLocale } from '../../composables/useLocale'
import { usePrecipitation } from '../../composables/usePrecipitation'
import { stationName } from '../../i18n'
import { forecastOutlook } from '../../lib/anomaly'
import { buildChartSeries } from '../../lib/chartSeries'
import { downloadCsv, stationCsv } from '../../lib/csv'
import { formatCoordinates, formatDischarge, formatPct } from '../../lib/format'
import { useUiStore, type ChartRange } from '../../stores/ui'
import type { ClimateSummary } from '../../lib/climate'
import type { ClimateFile, DischargeSeries, StationNorms, StationState } from '../../types'
import AnomalyBadge from '../ui/AnomalyBadge.vue'
import ErrorState from '../ui/ErrorState.vue'
import LoadingSkeleton from '../ui/LoadingSkeleton.vue'
import OutlookBadge from '../ui/OutlookBadge.vue'
import ChartControls from './ChartControls.vue'
import ClimateSection from './ClimateSection.vue'
import DischargeChart from './DischargeChart.vue'
import StatRow from './StatRow.vue'

const props = defineProps<{
  state: StationState
  /** `undefined` while discharge is loading or after it failed. */
  series: DischargeSeries | undefined
  norms: StationNorms | null
  today: string
  /** Status of the discharge query `series` comes from. */
  status: 'pending' | 'error' | 'success'
  /** Shown when `status` is `error`. */
  errorMessage: string
  climate: ClimateFile | undefined
  climateSummary: ClimateSummary | null
  climateStatus: 'pending' | 'error' | 'success'
  thisYearFailed: boolean
}>()
defineEmits<{ retry: []; retryClimate: [] }>()

/** The short period shows 30 past days; the longer ones show 60, all the data request holds. */
const PAST_DAYS: Record<ChartRange, number> = { 30: 30, 90: 60, 210: 60 }

const ui = useUiStore()
const { locale, t } = useLocale()
const name = computed(() => stationName(props.state.station, locale.value))
const heading = useTemplateRef<HTMLHeadingElement>('heading')

const precipitation = usePrecipitation(
  () => props.state.station,
  () => ui.showPrecip,
)
const precipitationError = computed(() => {
  if (!ui.showPrecip || !precipitation.isError.value) return null
  return isRateLimited(precipitation.error.value)
    ? t.value.details.precipitationRateLimited
    : t.value.details.precipitationFailed
})

const outlook = computed(
  () => props.series && props.norms && forecastOutlook(props.series, props.norms, props.today),
)

/** Relative mode needs a median norm to divide by; without norms the chart stays in m³/s. */
const relative = computed(() => ui.mode === 'pct' && props.norms !== null)

const chartSeries = computed(
  () =>
    props.series &&
    buildChartSeries(
      props.series,
      props.norms,
      {
        today: props.today,
        pastDays: PAST_DAYS[ui.range],
        forecastDays: ui.range,
        relative: relative.value,
      },
      ui.showPrecip ? (precipitation.data.value ?? null) : null,
    ),
)

function exportCsv() {
  if (!props.series) return
  downloadCsv(`${props.state.station.id}-${props.today}.csv`, stationCsv(props.series, props.norms))
}

// The panel opens beside the map; move focus so keyboard and screen-reader users follow.
onMounted(() => heading.value?.focus())
</script>

<template>
  <article class="space-y-4">
    <header>
      <div class="flex items-start justify-between gap-3">
        <h2
          ref="heading"
          tabindex="-1"
          class="text-lg font-semibold text-slate-900 dark:text-slate-100 focus-visible:outline-none"
        >
          {{ name.river }} — {{ name.place }}
        </h2>
        <button
          type="button"
          :aria-label="t.details.close"
          :title="t.details.close"
          class="-m-1 inline-flex size-8 shrink-0 items-center justify-center rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-sky-700 dark:focus-visible:outline-sky-400"
          @click="ui.selectStation(null)"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-5"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
          >
            <path stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <p
        class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 dark:text-slate-400"
      >
        <span>{{ t.details.basin(t.basins[state.station.basin]) }}</span>
        <span
          v-if="state.station.focus"
          class="rounded bg-sky-100 dark:bg-sky-900 px-1.5 text-[11px] text-sky-900 dark:text-sky-100"
        >
          {{ t.panel.focusBasin }}
        </span>
      </p>
      <p v-if="state.cell" class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {{ t.details.cell(formatCoordinates(state.cell, locale)) }}
      </p>
    </header>

    <dl
      class="divide-y divide-slate-200 dark:divide-slate-700 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
    >
      <StatRow
        :label="t.details.now"
        :value="formatDischarge(state.current, locale)"
        :unit="t.dischargeUnit"
      />
      <StatRow
        :label="t.details.normToday"
        :value="formatDischarge(state.norm?.median ?? null, locale)"
        :unit="t.dischargeUnit"
      />
      <StatRow :label="t.details.deviation" :value="formatPct(state.anomalyPct, locale)">
        <AnomalyBadge v-if="state.anomalyClass" :anomaly-class="state.anomalyClass" />
      </StatRow>
    </dl>

    <OutlookBadge v-if="outlook" :outlook="outlook" />

    <section class="space-y-3" aria-labelledby="chart-heading">
      <h3 id="chart-heading" class="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {{ t.details.chartHeading }}
      </h3>
      <ChartControls />
      <p v-if="ui.mode === 'pct' && !norms" class="text-xs text-slate-600 dark:text-slate-400">
        {{ t.details.normsMissing }}
      </p>
      <LoadingSkeleton
        v-if="status === 'pending'"
        :label="t.details.loadingChart"
        class="h-[260px] lg:h-80"
      />
      <ErrorState v-else-if="status === 'error'" :message="errorMessage" @retry="$emit('retry')" />
      <DischargeChart
        v-else-if="chartSeries"
        :series="chartSeries"
        :today="today"
        :relative="relative"
      />
      <div
        v-else
        class="flex h-[260px] items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-sm text-slate-500 dark:text-slate-400 lg:h-80"
      >
        {{ t.details.noChartData }}
      </div>
      <p v-if="precipitationError" role="status" class="text-xs text-amber-800 dark:text-amber-300">
        {{ precipitationError }}
      </p>
      <button
        v-if="series"
        type="button"
        class="inline-flex items-center gap-1.5 rounded border border-slate-300 dark:border-slate-600 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-700 dark:focus-visible:outline-sky-400"
        @click="exportCsv"
      >
        <svg
          viewBox="0 0 24 24"
          class="size-4"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
        >
          <path
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 4v11m-4-4l4 4 4-4M5 19h14"
          />
        </svg>
        {{ t.details.exportCsv }}
      </button>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ t.details.chartNote }}
        <template v-if="ui.showPrecip"> {{ t.details.precipitationNote }}</template>
      </p>
    </section>

    <ClimateSection
      :climate="climate"
      :summary="climateSummary"
      :status="climateStatus"
      :this-year-failed="thisYearFailed"
      :today="today"
      @retry="$emit('retryClimate')"
    />
  </article>
</template>
