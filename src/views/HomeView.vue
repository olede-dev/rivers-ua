<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'

import AppFooter from '../components/layout/AppFooter.vue'
import AppHeader from '../components/layout/AppHeader.vue'
import RiverMap from '../components/map/RiverMap.vue'
import BasinFilter from '../components/panel/BasinFilter.vue'
import StationList from '../components/panel/StationList.vue'
import { useStationsState } from '../composables/useStationsState'
import { useUiStore } from '../stores/ui'

// Chart.js loads only when a station is opened, keeping it out of the initial bundle.
const StationDetails = defineAsyncComponent(() => import('../components/panel/StationDetails.vue'))

const ui = useUiStore()
const { states, today, discharge, norms } = useStationsState()
const dischargeSettled = computed(() => !discharge.isPending.value)
const selected = computed(() => states.value.find((s) => s.station.id === ui.selectedId) ?? null)
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-slate-50 lg:h-dvh">
    <AppHeader />
    <main class="flex-1 lg:grid lg:min-h-0 lg:grid-cols-[3fr_2fr]">
      <section class="h-[45vh] lg:h-full" aria-label="Карта">
        <RiverMap :states="states" :show-markers="dischargeSettled" />
      </section>
      <aside
        class="space-y-4 border-slate-200 bg-white p-4 lg:overflow-y-auto lg:border-l"
        :aria-label="selected ? 'Станція' : undefined"
        :aria-labelledby="selected ? undefined : 'stations-heading'"
      >
        <StationDetails
          v-if="selected"
          :key="selected.station.id"
          :state="selected"
          :series="discharge.data.value?.get(selected.station.id)"
          :norms="norms.data.value?.stations[selected.station.id] ?? null"
          :today="today"
        />
        <template v-else>
          <h2 id="stations-heading" class="text-base font-semibold text-slate-900">Станції</h2>
          <BasinFilter />
          <div
            v-if="discharge.isError.value"
            role="alert"
            class="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
          >
            Не вдалося завантажити дані Open-Meteo.
            <button
              type="button"
              class="rounded border border-amber-400 bg-white px-2 py-1 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-sky-700"
              @click="discharge.refetch()"
            >
              Спробувати ще
            </button>
          </div>
          <p v-if="norms.isError.value" class="text-sm text-slate-600">
            Норми не завантажилися — відхилення і стан водності недоступні.
          </p>
          <div v-if="discharge.isPending.value" class="space-y-3" aria-busy="true">
            <span class="sr-only">Завантаження даних…</span>
            <div v-for="n in 6" :key="n" class="h-8 animate-pulse rounded bg-slate-100"></div>
          </div>
          <StationList v-else :states="states" />
        </template>
      </aside>
    </main>
    <AppFooter />
  </div>
</template>
