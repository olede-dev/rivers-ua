<script setup lang="ts">
import { computed, defineAsyncComponent, h, ref, watch } from 'vue'

import AppFooter from '../components/layout/AppFooter.vue'
import AppHeader from '../components/layout/AppHeader.vue'
import StationsSidebar from '../components/layout/StationsSidebar.vue'
import MapTimeline from '../components/map/MapTimeline.vue'
import { legendContent, mapMarks } from '../components/map/mapMarks'
import RiverMap from '../components/map/RiverMap.vue'
import LoadingSkeleton from '../components/ui/LoadingSkeleton.vue'
import SegmentedControl from '../components/ui/SegmentedControl.vue'
import { useClimate } from '../composables/useClimate'
import { useLocale } from '../composables/useLocale'
import { useMediaQuery } from '../composables/useMediaQuery'
import { useStationsState } from '../composables/useStationsState'
import { useUrlSync } from '../composables/useUrlSync'
import { MAP_LAYERS } from '../config/climateClasses'
import { DISCHARGE_WINDOW } from '../config/discharge'
import { dischargeErrorMessage, snapshotNotice } from '../lib/dischargeMessages'
import { OUTLOOK_DAYS } from '../lib/anomaly'
import { todayKyiv } from '../lib/dates'
import { useUiStore } from '../stores/ui'

const { locale, t } = useLocale()

// Chart.js loads only when a station is opened, keeping it out of the initial bundle.
const StationDetails = defineAsyncComponent({
  loader: () => import('../components/panel/StationDetails.vue'),
  loadingComponent: () => h(LoadingSkeleton, { label: t.value.home.loadingStation, class: 'h-96' }),
  delay: 100,
})

const ui = useUiStore()
useUrlSync()
/** Day the map shows; the timelapse moves it, the sidebar and station panel stay on today. */
const mapDate = ref(todayKyiv())
const { states, mapStates, today, discharge, norms } = useStationsState(mapDate)
/** The timelapse covers the past chart window and the forecast badge's horizon. */
const TIMELINE_PAST_DAYS = DISCHARGE_WINDOW.pastDays
const dischargeSettled = computed(() => !discharge.isPending.value)
const errorMessage = computed(() =>
  discharge.isError.value ? dischargeErrorMessage(discharge.error.value, locale.value) : null,
)
const notice = computed(() => snapshotNotice(discharge.data.value?.source, locale.value))
const selected = computed(() => states.value.find((s) => s.station.id === ui.selectedId) ?? null)

// Climate data loads only once a climate layer or a station panel needs it.
const climate = useClimate(
  () => norms.data.value,
  () => ui.layer !== 'state' || selected.value !== null,
)
const layerOptions = computed(() =>
  MAP_LAYERS.map((value) => ({ value, label: t.value.climate.layers[value] })),
)
/** The timelapse moves the water state only; climate layers always show today. */
const marks = computed(() =>
  mapMarks(
    ui.layer,
    ui.layer === 'state' ? mapStates.value : states.value,
    climate.summaries.value,
    locale.value,
    t.value,
  ),
)
const legend = computed(() => legendContent(ui.layer, t.value, climate.climate.data.value))
watch(
  () => ui.layer,
  (layer) => {
    if (layer !== 'state') mapDate.value = today
  },
)

// Tailwind's `lg`: the sidebar docks beside the map and starts open; below it, a closed drawer.
const isDesktop = useMediaQuery('(min-width: 64rem)')
watch(isDesktop, (desktop) => (ui.sidebarOpen = desktop), { immediate: true })
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-slate-50 dark:bg-slate-950 lg:h-dvh">
    <AppHeader />
    <p
      v-if="notice"
      role="status"
      class="shrink-0 border-b border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-4 py-2 text-sm text-amber-950 dark:text-amber-100"
    >
      {{ notice }}
    </p>
    <div class="flex flex-1 lg:min-h-0">
      <main class="flex min-w-0 flex-1 flex-col lg:flex-row">
        <section
          class="relative isolate shrink-0 lg:h-auto lg:min-w-0 lg:flex-1"
          :class="selected ? 'h-[45dvh]' : 'h-[calc(100dvh-7rem)]'"
          :aria-label="t.home.map"
        >
          <RiverMap
            :states="ui.layer === 'state' ? mapStates : states"
            :marks="marks"
            :legend="legend"
            :show-markers="dischargeSettled"
          />
          <div
            class="absolute top-2.5 right-2.5 z-[1000] rounded-md bg-white/95 shadow dark:bg-slate-900/95"
          >
            <SegmentedControl
              v-model="ui.layer"
              :label="t.climate.layerLabel"
              :options="layerOptions"
            />
          </div>
          <!--
            Phones: top of the map, clear of the zoom buttons, since the legend and attribution fill
            the bottom. Wider screens: bottom right, above the attribution and away from the
            legend (bottom left). Above Leaflet's panes and controls (z-index up to 1000).
          -->
          <div
            v-if="discharge.isSuccess.value && ui.layer === 'state'"
            class="pointer-events-none absolute inset-x-0 top-14 z-[1000] flex justify-center pr-2.5 pl-14 sm:top-auto sm:bottom-7 sm:justify-end sm:pl-2.5"
          >
            <MapTimeline
              v-model="mapDate"
              class="w-full max-w-sm"
              :today="today"
              :past-days="TIMELINE_PAST_DAYS"
              :future-days="OUTLOOK_DAYS"
            />
          </div>
        </section>
        <aside
          v-if="selected"
          :aria-label="t.home.station"
          class="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 lg:w-[26rem] lg:shrink-0 lg:overflow-y-auto lg:border-l xl:w-[32rem] 2xl:w-[36rem]"
        >
          <StationDetails
            :key="selected.station.id"
            :state="selected"
            :series="discharge.data.value?.series.get(selected.station.id)"
            :norms="norms.data.value?.stations[selected.station.id] ?? null"
            :climate="climate.climate.data.value"
            :climate-summary="climate.summaries.value.get(selected.station.id) ?? null"
            :climate-status="climate.climate.status.value"
            :this-year-failed="climate.thisYear.isError.value"
            :today="today"
            :status="discharge.status.value"
            :error-message="errorMessage ?? ''"
            @retry="discharge.refetch()"
            @retry-climate="climate.climate.refetch()"
          />
        </aside>
        <div
          v-else-if="!isDesktop"
          class="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-600 dark:text-slate-400"
        >
          <span>{{ t.home.pickStation }}</span>
          <button
            type="button"
            class="rounded-md bg-sky-800 dark:bg-sky-700 px-3 py-1.5 font-medium text-white hover:bg-sky-900 dark:hover:bg-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:focus-visible:outline-sky-400"
            @click="ui.sidebarOpen = true"
          >
            {{ t.home.stationList }}
          </button>
        </div>
      </main>
      <StationsSidebar
        :states="states"
        :modal="!isDesktop"
        :pending="discharge.isPending.value"
        :discharge-error-message="errorMessage"
        :norms-error="norms.isError.value"
        @retry="discharge.refetch()"
      />
    </div>
    <AppFooter />
  </div>
</template>
