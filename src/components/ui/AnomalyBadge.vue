<script setup lang="ts">
import { computed } from 'vue'

import { useLocale } from '../../composables/useLocale'
import { ANOMALY_CLASS_INFO, NO_DATA_STROKE } from '../../config/anomalyClasses'
import type { AnomalyClass } from '../../types'

const props = defineProps<{ anomalyClass: AnomalyClass }>()

const { t } = useLocale()
const info = computed(() => ANOMALY_CLASS_INFO[props.anomalyClass])
const dotStyle = computed(() =>
  info.value.color ? { background: info.value.color } : { border: `2px solid ${NO_DATA_STROKE}` },
)
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-xs leading-tight text-slate-800 dark:text-slate-200"
  >
    <span class="size-2.5 shrink-0 rounded-full" :style="dotStyle"></span>
    {{ t.anomalyClasses[anomalyClass] }}
  </span>
</template>
