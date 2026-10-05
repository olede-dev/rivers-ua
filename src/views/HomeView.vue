<script setup lang="ts">
import { computed, defineAsyncComponent, h, watch } from 'vue'

import AppFooter from '../components/layout/AppFooter.vue'
import AppHeader from '../components/layout/AppHeader.vue'
import StationsSidebar from '../components/layout/StationsSidebar.vue'
import RiverMap from '../components/map/RiverMap.vue'
import LoadingSkeleton from '../components/ui/LoadingSkeleton.vue'
import { useMediaQuery } from '../composables/useMediaQuery'
import { useStationsState } from '../composables/useStationsState'
import { useUrlSync } from '../composables/useUrlSync'
import { dischargeErrorMessage, snapshotNotice } from '../lib/dischargeMessages'
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
const errorMessage = computed(() =>
  discharge.isError.value ? dischargeErrorMessage(discharge.error.value) : null,
)
const notice = computed(() => snapshotNotice(discharge.data.value?.source))
const selected = computed(() => states.value.find((s) => s.station.id === ui.selectedId) ?? null)

// Tailwind's `lg`: the sidebar docks beside the map and starts open; below it, a closed drawer.
const isDesktop = useMediaQuery('(min-width: 64rem)')
watch(isDesktop, (desktop) => (ui.sidebarOpen = desktop), { immediate: true })
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-slate-50 lg:h-dvh">
    <AppHeader />
    <p
      v-if="notice"
      role="status"
      class="shrink-0 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950"
    >
      {{ notice }}
    </p>
    <div class="flex flex-1 lg:min-h-0">
      <StationsSidebar
        :states="states"
        :modal="!isDesktop"
        :pending="discharge.isPending.value"
        :discharge-error-message="errorMessage"
        :norms-error="norms.isError.value"
        @retry="discharge.refetch()"
      />
      <main class="flex min-w-0 flex-1 flex-col lg:flex-row">
        <section
          class="isolate shrink-0 lg:h-auto lg:min-w-0 lg:flex-1"
          :class="selected ? 'h-[45dvh]' : 'h-[calc(100dvh-7rem)]'"
          aria-label="Карта"
        >
          <RiverMap :states="states" :show-markers="dischargeSettled" />
        </section>
        <aside
          v-if="selected"
          aria-label="Станція"
          class="border-slate-200 bg-white p-4 lg:w-[26rem] lg:shrink-0 lg:overflow-y-auto lg:border-l xl:w-[32rem] 2xl:w-[36rem]"
        >
          <StationDetails
            :key="selected.station.id"
            :state="selected"
            :series="discharge.data.value?.series.get(selected.station.id)"
            :norms="norms.data.value?.stations[selected.station.id] ?? null"
            :today="today"
            :status="discharge.status.value"
            :error-message="errorMessage ?? ''"
            @retry="discharge.refetch()"
          />
        </aside>
        <div
          v-else-if="!isDesktop"
          class="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 text-sm text-slate-600"
        >
          <span>Оберіть станцію на карті</span>
          <button
            type="button"
            class="rounded-md bg-sky-800 px-3 py-1.5 font-medium text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            @click="ui.sidebarOpen = true"
          >
            Список станцій
          </button>
        </div>
      </main>
    </div>
    <AppFooter />
  </div>
</template>
