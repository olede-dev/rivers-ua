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
  <p class="flex items-start gap-3 rounded-xl bg-group px-3.5 py-3 text-sm">
    <span
      class="flex size-7 shrink-0 items-center justify-center rounded-full text-white"
      :style="{ background: color }"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor">
        <path
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          :d="isHigh ? 'M12 19V5M5 12l7-7 7 7' : 'M12 5v14M5 12l7 7 7-7'"
        />
      </svg>
    </span>
    <span>
      <span class="font-semibold text-ink">{{
        isHigh ? t.details.outlook.high : t.details.outlook.low
      }}</span>
      <span class="mt-0.5 block text-xs text-ink-muted">{{ detail }}</span>
    </span>
  </p>
</template>
