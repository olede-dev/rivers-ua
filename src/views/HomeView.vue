<script setup lang="ts">
import { computed, defineAsyncComponent, h, ref, watch } from 'vue'

import AppFooter from '../components/layout/AppFooter.vue'
import AppHeader from '../components/layout/AppHeader.vue'
import StationsSidebar from '../components/layout/StationsSidebar.vue'
import MapTimeline from '../components/map/MapTimeline.vue'
import { legendContent, mapMarks } from '../components/map/mapMarks'
import type { BasemapKind } from '../components/map/basemap'
import RiverMap from '../components/map/RiverMap.vue'
import LoadingSkeleton from '../components/ui/LoadingSkeleton.vue'
import SegmentedControl from '../components/ui/SegmentedControl.vue'
import { useClimate } from '../composables/useClimate'
import { useLocale } from '../composables/useLocale'
import { useMediaQuery } from '../composables/useMediaQuery'
import { useStationsState } from '../composables/useStationsState'
import { useUrlSync } from '../composables/useUrlSync'
import { MAP_LAYERS, type MapLayer } from '../config/climateClasses'
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

const basemap = ref<BasemapKind>('openfreemap')

// Climate data loads only once a climate layer or a station panel needs it.
const climate = useClimate(
  () => norms.data.value,
  () => ui.layer !== 'state' || selected.value !== null,
)
const LAYER_ICONS: Record<MapLayer, string> = {
  // A pulse line: the water state right now.
  state: 'M3 12h4l3-8 4 16 3-8h4',
  // A rising line: the long-term change.
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  // A drop with a low water level: how often rivers run low.
  lowFlow: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11zM7 16h10',
}
const layerOptions = computed(() =>
  MAP_LAYERS.map((value) => ({
    value,
    label: t.value.climate.layers[value],
    icon: LAYER_ICONS[value],
  })),
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
/** Tailwind's `sm`: below it the timeline leaves the map for a card of its own under it. */
const isWide = useMediaQuery('(min-width: 40rem)')
const showTimeline = computed(() => discharge.isSuccess.value && ui.layer === 'state')
/**
 * Phones without a selection: the map fills the screen between the header and the cards below
 * (gutters, the 3.5rem header and bar, the 3.75rem timeline).
 */
const mapHeight = computed(() => {
  if (selected.value) return 'h-[45dvh]'
  if (showTimeline.value && !isWide.value) return 'h-[calc(100dvh-12.75rem)]'
  return 'h-[calc(100dvh-8.5rem)] sm:h-[calc(100dvh-9.25rem)]'
})
</script>

<template>
  <!-- Every block is a rounded card on the canvas, separated by one gutter (gap and padding). -->
  <div class="flex min-h-dvh flex-col gap-2 bg-canvas p-2 sm:gap-3 sm:p-3 lg:h-dvh">
    <AppHeader />
    <p
      v-if="notice"
      role="status"
      class="shrink-0 rounded-xl bg-amber-100/80 px-4 py-2.5 text-sm text-amber-950 dark:bg-amber-950/70 dark:text-amber-100"
    >
      {{ notice }}
    </p>
    <div class="flex flex-1 gap-3 lg:min-h-0">
      <main class="flex min-w-0 flex-1 flex-col gap-2 sm:gap-3 lg:flex-row">
        <section
          class="@container relative isolate shrink-0 overflow-hidden rounded-2xl bg-surface shadow-card lg:h-auto lg:min-w-0 lg:flex-1"
          :class="mapHeight"
          :aria-label="t.home.map"
        >
          <RiverMap
            :states="ui.layer === 'state' ? mapStates : states"
            :marks="marks"
            :legend="legend"
            :show-markers="dischargeSettled"
            @basemap="basemap = $event"
          />
          <div class="glass absolute top-3 right-3 z-[1000] rounded-[10px] shadow-float">
            <SegmentedControl
              v-model="ui.layer"
              :label="t.climate.layerLabel"
              :options="layerOptions"
            />
          </div>
          <!--
            A wide map card: bottom right, beside the legend (bottom left). A narrow one (a station
            open beside it): top, under the layer switch and clear of the zoom buttons. Phones: a
            card of its own under the map, below.
          -->
          <div
            v-if="showTimeline && isWide"
            class="pointer-events-none absolute inset-x-3 top-15 z-[1000] flex justify-center pl-11 @2xl:top-auto @2xl:bottom-2.5 @2xl:justify-end @2xl:pl-0"
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
        <MapTimeline
          v-if="showTimeline && !isWide"
          v-model="mapDate"
          class="h-15 shrink-0"
          :today="today"
          :past-days="TIMELINE_PAST_DAYS"
          :future-days="OUTLOOK_DAYS"
        />
        <aside
          v-if="selected"
          :aria-label="t.home.station"
          class="rounded-2xl bg-surface p-5 shadow-card lg:w-[26rem] lg:shrink-0 lg:overflow-y-auto xl:w-[32rem] 2xl:w-[36rem]"
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
          class="flex h-14 shrink-0 items-center justify-between gap-3 rounded-2xl bg-surface pr-2 pl-4 text-sm text-ink-muted shadow-card"
        >
          <span>{{ t.home.pickStation }}</span>
          <button
            type="button"
            class="rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover focus-ring"
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
    <AppFooter :basemap="basemap" />
  </div>
</template>
