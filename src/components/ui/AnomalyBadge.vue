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
    class="inline-flex items-center gap-1.5 rounded-full bg-surface px-2 py-0.5 text-xs leading-tight font-medium text-ink shadow-card"
  >
    <span class="size-2.5 shrink-0 rounded-full" :style="dotStyle"></span>
    {{ t.anomalyClasses[anomalyClass] }}
  </span>
</template>
