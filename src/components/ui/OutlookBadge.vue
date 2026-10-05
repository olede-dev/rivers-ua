<script setup lang="ts">
import { computed } from 'vue'

import { useLocale } from '../../composables/useLocale'
import { ANOMALY_CLASS_INFO } from '../../config/anomalyClasses'
import type { ForecastOutlook } from '../../lib/anomaly'
import { formatDayMonth } from '../../lib/format'

const props = defineProps<{ outlook: ForecastOutlook }>()

const { locale, t } = useLocale()
const isHigh = computed(() => props.outlook.kind === 'high')
const color = computed(() => ANOMALY_CLASS_INFO[isHigh.value ? 'very-high' : 'very-low'].color!)
const detail = computed(() => {
  const date = formatDayMonth(props.outlook.from, locale.value)
  return isHigh.value
    ? t.value.details.outlook.highDetail(date)
    : t.value.details.outlook.lowDetail(date)
})
</script>

<template>
  <p
    class="flex items-start gap-2 rounded-md border border-l-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
    :style="{ borderLeftColor: color }"
  >
    <svg
      viewBox="0 0 24 24"
      class="mt-0.5 size-4 shrink-0"
      :style="{ color }"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
    >
      <path
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        :d="isHigh ? 'M12 19V5M5 12l7-7 7 7' : 'M12 5v14M5 12l7 7 7-7'"
      />
    </svg>
    <span>
      <span class="font-medium text-slate-900 dark:text-slate-100">{{
        isHigh ? t.details.outlook.high : t.details.outlook.low
      }}</span>
      <span class="block text-xs text-slate-600 dark:text-slate-400">{{ detail }}</span>
    </span>
  </p>
</template>
