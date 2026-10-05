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
  <article class="space-y-6">
    <header>
      <div class="flex items-start justify-between gap-3">
        <h2
          ref="heading"
          tabindex="-1"
          class="text-2xl leading-tight font-semibold tracking-tight text-ink focus-visible:outline-none"
        >
          {{ name.river }} — {{ name.place }}
        </h2>
        <button
          type="button"
          :aria-label="t.details.close"
          :title="t.details.close"
          class="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-fill text-ink-muted transition-colors hover:bg-fill-strong hover:text-ink focus-ring"
          @click="ui.selectStation(null)"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-3.5"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
          >
            <path stroke-width="2.5" stroke-linecap="round" d="M7 7l10 10M17 7L7 17" />
          </svg>
        </button>
      </div>
      <p class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
        <span>{{ t.details.basin(t.basins[state.station.basin]) }}</span>
        <span
          v-if="state.station.focus"
          class="rounded-full bg-accent/12 px-2 text-[11px] font-medium text-accent-ink"
        >
          {{ t.panel.focusBasin }}
        </span>
      </p>
      <p v-if="state.cell" class="mt-0.5 text-xs text-ink-muted">
        {{ t.details.cell(formatCoordinates(state.cell, locale)) }}
      </p>
    </header>

    <dl class="divide-y divide-line rounded-xl bg-group text-ink">
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
      <h3 id="chart-heading" class="text-[17px] font-semibold tracking-tight text-ink">
        {{ t.details.chartHeading }}
      </h3>
      <ChartControls />
      <p v-if="ui.mode === 'pct' && !norms" class="text-xs text-ink-muted">
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
        class="flex h-[260px] items-center justify-center rounded-xl bg-group text-sm text-ink-muted lg:h-80"
      >
        {{ t.details.noChartData }}
      </div>
      <p v-if="precipitationError" role="status" class="text-xs text-amber-800 dark:text-amber-300">
        {{ precipitationError }}
      </p>
      <button
        v-if="series"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full bg-fill px-3.5 py-1.5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-fill-strong focus-ring"
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
      <p class="text-xs leading-relaxed text-ink-muted">
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
