<script setup lang="ts">
import { computed } from 'vue'

import { ANOMALY_CLASS_INFO, NO_DATA_STROKE } from '../../config/anomalyClasses'
import type { AnomalyClass } from '../../types'

const props = defineProps<{ anomalyClass: AnomalyClass }>()

const info = computed(() => ANOMALY_CLASS_INFO[props.anomalyClass])
const dotStyle = computed(() =>
  info.value.color ? { background: info.value.color } : { border: `2px solid ${NO_DATA_STROKE}` },
)
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs leading-tight text-slate-800"
  >
    <span class="size-2.5 shrink-0 rounded-full" :style="dotStyle"></span>
    {{ info.label }}
  </span>
</template>
