<script setup lang="ts">
import { BASINS } from '../../config/basins'
import { useUiStore, type BasinFilterValue } from '../../stores/ui'

const ui = useUiStore()
const options: { id: BasinFilterValue; label: string }[] = [{ id: 'all', label: 'Усі' }, ...BASINS]
</script>

<template>
  <div role="group" aria-label="Басейн" class="flex flex-wrap gap-2">
    <button
      v-for="option in options"
      :key="option.id"
      type="button"
      :aria-pressed="ui.basin === option.id"
      class="rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
      :class="
        ui.basin === option.id
          ? 'border-sky-800 bg-sky-800 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
      "
      @click="ui.basin = option.id"
    >
      {{ option.label }}
    </button>
  </div>
</template>
