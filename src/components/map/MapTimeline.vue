<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { useLocale } from '../../composables/useLocale'
import { addDays, daysBetween } from '../../lib/dates'
import { formatDayMonth } from '../../lib/format'

const props = defineProps<{
  today: string
  /** Days before and after today the slider covers. */
  pastDays: number
  futureDays: number
}>()
const date = defineModel<string>({ required: true })

/** One day per frame: the 90-day window plays in about 13 s. */
const FRAME_MS = 140

const { locale, t } = useLocale()
const start = computed(() => addDays(props.today, -props.pastDays))
const total = computed(() => props.pastDays + props.futureDays)
const index = computed({
  get: () => daysBetween(start.value, date.value),
  set: (value: number) => (date.value = addDays(start.value, value)),
})
const todayIndex = computed(() => props.pastDays)
const isForecast = computed(() => date.value > props.today)

const playing = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

function stop() {
  playing.value = false
  clearInterval(timer)
  timer = undefined
}

function toggle() {
  if (playing.value) return stop()
  // From the end, start over; otherwise continue from the current day.
  if (index.value >= total.value) index.value = 0
  playing.value = true
  timer = setInterval(() => {
    if (index.value >= total.value) return stop()
    index.value += 1
  }, FRAME_MS)
}

function backToToday() {
  stop()
  date.value = props.today
}

// A drag on the slider takes over from playback.
watch(date, (value, previous) => {
  if (playing.value && daysBetween(previous, value) !== 1) stop()
})
onBeforeUnmount(stop)
</script>

<template>
  <div
    class="pointer-events-auto flex items-center gap-2 rounded-xl sm:gap-3 border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-2 py-1.5 shadow-lg sm:px-3 sm:py-2 backdrop-blur"
  >
    <button
      type="button"
      class="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-800 dark:bg-sky-700 text-white hover:bg-sky-900 dark:hover:bg-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:focus-visible:outline-sky-400"
      :aria-label="playing ? t.map.timeline.pause : t.map.timeline.play"
      :aria-pressed="playing"
      @click="toggle"
    >
      <svg v-if="playing" viewBox="0 0 16 16" class="size-4" fill="currentColor" aria-hidden="true">
        <rect x="3" y="2" width="3.5" height="12" rx="1" />
        <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
      </svg>
      <svg v-else viewBox="0 0 16 16" class="size-4" fill="currentColor" aria-hidden="true">
        <path d="M4 2.5v11a1 1 0 0 0 1.5.86l9-5.5a1 1 0 0 0 0-1.72l-9-5.5A1 1 0 0 0 4 2.5Z" />
      </svg>
    </button>
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div class="flex items-baseline justify-between gap-2 text-xs">
        <span class="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
          {{ formatDayMonth(date, locale) }}
        </span>
        <span
          class="grid rounded px-1.5 py-0.5 text-center font-medium"
          :class="
            isForecast
              ? 'bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-200'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          "
        >
          <!-- Both labels share one grid cell so the badge keeps the wider one's width. -->
          <span class="col-start-1 row-start-1" :class="{ invisible: isForecast }">{{
            t.map.timeline.past
          }}</span>
          <span class="col-start-1 row-start-1" :class="{ invisible: !isForecast }">{{
            t.map.timeline.forecast
          }}</span>
        </span>
      </div>
      <div class="relative">
        <input
          v-model.number="index"
          type="range"
          min="0"
          :max="total"
          step="1"
          class="timeline-range w-full accent-sky-700 dark:accent-sky-400"
          :aria-label="t.map.timeline.label"
          :aria-valuetext="formatDayMonth(date, locale)"
        />
        <!-- Today's tick: observed values to the left, the ensemble median to the right. -->
        <span
          class="pointer-events-none absolute top-0 h-full w-px bg-slate-500/70"
          :style="{ left: `${(todayIndex / total) * 100}%` }"
          aria-hidden="true"
        ></span>
      </div>
    </div>
    <!-- Hidden rather than removed, so the slider keeps its width while playing. -->
    <button
      type="button"
      :class="{ invisible: date === today }"
      class="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-sky-800 dark:text-sky-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-sky-700 dark:focus-visible:outline-sky-400"
      :aria-label="t.map.timeline.todayLabel"
      @click="backToToday"
    >
      {{ t.map.timeline.today }}
    </button>
  </div>
</template>
