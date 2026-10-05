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
  <div role="group" :aria-label="t.panel.basin" class="flex flex-wrap gap-1.5">
    <button
      v-for="option in options"
      :key="option.id"
      type="button"
      :aria-pressed="ui.basin === option.id"
      class="rounded-full px-3 py-1 text-[13px] font-medium transition-colors focus-ring"
      :class="
        ui.basin === option.id ? 'bg-accent text-white' : 'bg-fill text-ink hover:bg-fill-strong'
      "
      @click="ui.basin = option.id"
    >
      {{ option.label }}
    </button>
  </div>
</template>
