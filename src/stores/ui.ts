import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  DEFAULT_URL_STATE,
  type BasinFilterValue,
  type ChartMode,
  type ChartRange,
  type UrlState,
} from '../lib/urlState'

export type { BasinFilterValue, ChartMode, ChartRange }

/** Client-only UI state; server data lives in vue-query. Mirrored in the URL by `useUrlSync`. */
export const useUiStore = defineStore('ui', () => {
  const selectedId = ref<string | null>(DEFAULT_URL_STATE.station)
  const basin = ref<BasinFilterValue>(DEFAULT_URL_STATE.basin)
  const range = ref<ChartRange>(DEFAULT_URL_STATE.range)
  const mode = ref<ChartMode>(DEFAULT_URL_STATE.mode)
  const showPrecip = ref(DEFAULT_URL_STATE.precip)

  function selectStation(id: string | null) {
    selectedId.value = id
  }

  function toUrlState(): UrlState {
    return {
      station: selectedId.value,
      basin: basin.value,
      range: range.value,
      mode: mode.value,
      precip: showPrecip.value,
    }
  }

  function applyUrlState(state: UrlState) {
    selectedId.value = state.station
    basin.value = state.basin
    range.value = state.range
    mode.value = state.mode
    showPrecip.value = state.precip
  }

  return {
    selectedId,
    basin,
    range,
    mode,
    showPrecip,
    selectStation,
    toUrlState,
    applyUrlState,
  }
})
