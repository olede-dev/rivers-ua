import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { BasinId } from '../types'

export type BasinFilterValue = BasinId | 'all'
/** Forecast horizon of the chart, in days. */
export type ChartRange = 30 | 90 | 210
export type ChartMode = 'abs' | 'pct'

/** Client-only UI state; server data lives in vue-query. */
export const useUiStore = defineStore('ui', () => {
  const selectedId = ref<string | null>(null)
  const basin = ref<BasinFilterValue>('all')
  const range = ref<ChartRange>(90)
  const mode = ref<ChartMode>('abs')
  const showPrecip = ref(false)

  function selectStation(id: string | null) {
    selectedId.value = id
  }

  return { selectedId, basin, range, mode, showPrecip, selectStation }
})
