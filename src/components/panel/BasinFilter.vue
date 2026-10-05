<script setup lang="ts">
import { computed } from 'vue'

import { useLocale } from '../../composables/useLocale'
import { BASIN_IDS } from '../../config/basins'
import { useUiStore, type BasinFilterValue } from '../../stores/ui'

const ui = useUiStore()
const { t } = useLocale()
const options = computed((): { id: BasinFilterValue; label: string }[] => [
  { id: 'all', label: t.value.panel.allBasins },
  ...BASIN_IDS.map((id) => ({ id, label: t.value.basins[id] })),
])
</script>

<template>
  <div role="group" :aria-label="t.panel.basin" class="flex flex-wrap gap-2">
    <button
      v-for="option in options"
      :key="option.id"
      type="button"
      :aria-pressed="ui.basin === option.id"
      class="rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:focus-visible:outline-sky-400"
      :class="
        ui.basin === option.id
          ? 'border-sky-800 dark:border-sky-700 bg-sky-800 dark:bg-sky-700 text-white'
          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
      "
      @click="ui.basin = option.id"
    >
      {{ option.label }}
    </button>
  </div>
</template>
