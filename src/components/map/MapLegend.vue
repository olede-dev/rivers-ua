<script setup lang="ts">
import { NO_DATA_STROKE } from '../../config/anomalyClasses'
import type { LegendContent } from './mapMarks'

defineProps<{ content: LegendContent }>()

/** Below this width the legend starts collapsed so it does not cover southern markers. */
const EXPANDED_LEGEND_QUERY = '(min-width: 640px)'
const startOpen = window.matchMedia(EXPANDED_LEGEND_QUERY).matches

/** Filled swatches carry the marker ring: white on the light map, dark on the dark one. */
function swatchStyle(color: string | null): string {
  return color
    ? `background:${color};box-shadow:0 0 0 1px ${NO_DATA_STROKE}`
    : `border:2px solid ${NO_DATA_STROKE}`
}
</script>

<template>
  <!-- Collapsible legend of the current layer's classes; the open state survives content changes. -->
  <details
    :open="startOpen"
    class="rounded-md bg-white/95 px-2 py-1.5 text-[11px] leading-tight shadow sm:px-3 sm:py-2 sm:text-xs dark:bg-slate-900/95"
  >
    <summary
      class="cursor-pointer font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-700 dark:text-slate-100 dark:focus-visible:outline-sky-400"
    >
      {{ content.title }}
    </summary>
    <ul class="mt-1 space-y-0.5 text-slate-700 dark:text-slate-300">
      <li v-for="row in content.rows" :key="row.label" class="flex items-center gap-2">
        <span
          class="inline-block size-3 shrink-0 rounded-full"
          :class="row.color ? 'border-[1.5px] border-white dark:border-slate-900' : ''"
          :style="swatchStyle(row.color)"
        ></span>
        {{ row.label }}
      </li>
    </ul>
    <p v-if="content.note" class="mt-1 max-w-48 text-[10px] text-slate-500 dark:text-slate-400">
      {{ content.note }}
    </p>
  </details>
</template>
