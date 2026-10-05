<script setup lang="ts">
import { computed, defineAsyncComponent, h } from 'vue'

import AppFooter from '../components/layout/AppFooter.vue'
import AppHeader from '../components/layout/AppHeader.vue'
import RiverMap from '../components/map/RiverMap.vue'
import BasinFilter from '../components/panel/BasinFilter.vue'
import StationList from '../components/panel/StationList.vue'
import ErrorState from '../components/ui/ErrorState.vue'
import LoadingSkeleton from '../components/ui/LoadingSkeleton.vue'
import { useStationsState } from '../composables/useStationsState'
import { useUrlSync } from '../composables/useUrlSync'
import { useUiStore } from '../stores/ui'

// Chart.js loads only when a station is opened, keeping it out of the initial bundle.
const StationDetails = defineAsyncComponent({
  loader: () => import('../components/panel/StationDetails.vue'),
  loadingComponent: () => h(LoadingSkeleton, { label: 'Завантаження станції…', class: 'h-96' }),
  delay: 100,
})

const ui = useUiStore()
useUrlSync()
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
          :status="discharge.status.value"
          @retry="discharge.refetch()"
        />
        <template v-else>
          <h2 id="stations-heading" class="text-base font-semibold text-slate-900">Станції</h2>
          <BasinFilter />
          <ErrorState
            v-if="discharge.isError.value"
            message="Не вдалося завантажити дані Open-Meteo."
            @retry="discharge.refetch()"
          />
          <p v-if="norms.isError.value" class="text-sm text-slate-600">
            Норми не завантажилися — відхилення і стан водності недоступні.
          </p>
          <LoadingSkeleton
            v-if="discharge.isPending.value"
            label="Завантаження даних…"
            class="space-y-3"
          >
            <div
              v-for="n in 6"
              :key="n"
              class="h-8 animate-pulse rounded bg-slate-100 motion-reduce:animate-none"
            ></div>
          </LoadingSkeleton>
          <StationList v-else :states="states" />
        </template>
      </aside>
    </main>
    <AppFooter />
  </div>
</template>
