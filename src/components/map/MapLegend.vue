<script setup lang="ts">
import { NO_DATA_STROKE } from '../../config/anomalyClasses'
import type { LegendContent } from './mapMarks'

defineProps<{ content: LegendContent }>()

/** Filled swatches carry the marker ring: white on the light map, dark on the dark one. */
function swatchStyle(color: string | null): string {
  return color
    ? `background:${color};box-shadow:0 0 0 1px ${NO_DATA_STROKE}`
    : `border:2px solid ${NO_DATA_STROKE}`
}
</script>

<template>
  <!--
    Collapsible legend of the current layer's classes, open at first at every width; the open
    state survives content changes.
  -->
  <details
    open
    class="glass rounded-xl px-2.5 py-2 text-[11px] leading-tight shadow-float sm:px-3 sm:py-2.5 sm:text-xs"
  >
    <summary class="cursor-pointer rounded font-semibold text-ink focus-ring">
      {{ content.title }}
    </summary>
    <ul class="mt-1.5 space-y-1 text-ink">
      <li v-for="row in content.rows" :key="row.label" class="flex items-center gap-2">
        <span
          class="inline-block size-3 shrink-0 rounded-full"
          :class="row.color ? 'border-[1.5px] border-white dark:border-slate-900' : ''"
          :style="swatchStyle(row.color)"
        ></span>
        {{ row.label }}
      </li>
    </ul>
    <p v-if="content.note" class="mt-1.5 max-w-48 text-[10px] text-ink-muted">
      {{ content.note }}
    </p>
  </details>
</template>
