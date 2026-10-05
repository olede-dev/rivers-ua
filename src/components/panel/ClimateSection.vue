<script setup lang="ts">
import { computed } from 'vue'

import { useLocale } from '../../composables/useLocale'
import type { ClimateSummary } from '../../lib/climate'
import { formatDayMonth, formatPct, formatYearRange } from '../../lib/format'
import type { ClimateFile } from '../../types'
import ErrorState from '../ui/ErrorState.vue'
import LoadingSkeleton from '../ui/LoadingSkeleton.vue'
import LowFlowChart from './LowFlowChart.vue'
import StatRow from './StatRow.vue'

const props = defineProps<{
  climate: ClimateFile | undefined
  summary: ClimateSummary | null
  status: 'pending' | 'error' | 'success'
  /** This year's discharge failed: only past years can be shown. */
  thisYearFailed: boolean
  today: string
}>()
defineEmits<{ retry: [] }>()

const { locale, t } = useLocale()
const currentYear = computed(() => Number(props.today.slice(0, 4)))
const rounded = (value: number | null) => (value === null ? '—' : String(Math.round(value)))
</script>

<template>
  <section class="space-y-3" aria-labelledby="climate-heading">
    <h3 id="climate-heading" class="text-sm font-semibold text-slate-900 dark:text-slate-100">
      {{ t.climate.heading }}
    </h3>
    <LoadingSkeleton v-if="status === 'pending'" :label="t.climate.loading" class="h-44" />
    <ErrorState
      v-else-if="status === 'error'"
      :message="t.climate.failed"
      @retry="$emit('retry')"
    />
    <template v-else-if="climate && summary">
      <dl
        class="divide-y divide-slate-200 dark:divide-slate-700 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
      >
        <StatRow :label="t.climate.meanChange" :value="formatPct(summary.meanChangePct, locale)" />
        <StatRow
          :label="t.climate.lowSeasonChange"
          :value="formatPct(summary.lowSeasonChangePct, locale)"
        />
        <StatRow
          :label="t.climate.thisYear"
          :value="summary.thisYear === null ? '—' : t.climate.days(summary.thisYear)"
        />
        <StatRow
          :label="t.climate.baselineMean(formatYearRange(climate.baseline))"
          :value="rounded(summary.baselineMean)"
        />
        <StatRow
          :label="t.climate.baselineMean(formatYearRange(climate.recent))"
          :value="rounded(summary.recentMean)"
        />
      </dl>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ t.climate.periods(formatYearRange(climate.recent), formatYearRange(climate.baseline)) }}
      </p>
      <h4 class="text-xs font-medium text-slate-700 dark:text-slate-300">
        {{ t.climate.chartHeading(formatDayMonth(today, locale)) }}
      </h4>
      <LowFlowChart
        :by-year="summary.byYear"
        :recent="climate.recent"
        :current-year="currentYear"
        :baseline-mean="summary.baselineMean"
      />
      <ul class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        <li class="flex items-center gap-1.5">
          <span class="inline-block size-2.5 rounded-sm bg-[#d6c3a5] dark:bg-[#6b5b45]"></span>
          {{ formatYearRange(climate.baseline) }}
        </li>
        <li class="flex items-center gap-1.5">
          <span class="inline-block size-2.5 rounded-sm bg-[#ec7014] dark:bg-[#f59e0b]"></span>
          {{ formatYearRange(climate.recent) }}
        </li>
        <li v-if="summary.thisYear !== null" class="flex items-center gap-1.5">
          <span class="inline-block size-2.5 rounded-sm bg-[#8c2d04] dark:bg-[#fdba74]"></span>
          {{ currentYear }}
        </li>
        <li class="flex items-center gap-1.5">
          <span
            class="inline-block w-3 border-t border-dashed border-slate-600 dark:border-slate-300"
          ></span>
          {{ t.climate.baselineMean(formatYearRange(climate.baseline)) }}
        </li>
      </ul>
      <p v-if="thisYearFailed" role="status" class="text-xs text-amber-800 dark:text-amber-300">
        {{ t.climate.thisYearFailed }}
      </p>
      <p class="text-xs text-slate-500 dark:text-slate-400">{{ t.climate.chartNote }}</p>
    </template>
  </section>
</template>
