<script setup lang="ts">
import type { StationState } from '../../types'
import ErrorState from '../ui/ErrorState.vue'
import LoadingSkeleton from '../ui/LoadingSkeleton.vue'
import BasinFilter from './BasinFilter.vue'
import StationList from './StationList.vue'

defineProps<{
  states: readonly StationState[]
  pending: boolean
  /** Set when discharge failed to load. */
  dischargeErrorMessage: string | null
  normsError: boolean
  closeLabel: string
}>()
defineEmits<{ retry: []; close: [] }>()
</script>

<template>
  <div class="space-y-4 p-4">
    <div class="flex items-center justify-between gap-2">
      <h2 id="stations-heading" class="text-base font-semibold text-slate-900">
        Станції <span class="font-normal text-slate-500">· {{ states.length }}</span>
      </h2>
      <button
        type="button"
        :aria-label="closeLabel"
        :title="closeLabel"
        class="-m-1 inline-flex size-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-700"
        @click="$emit('close')"
      >
        <svg
          viewBox="0 0 24 24"
          class="size-5"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
        >
          <path stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
    <BasinFilter />
    <ErrorState
      v-if="dischargeErrorMessage"
      :message="dischargeErrorMessage"
      @retry="$emit('retry')"
    />
    <p v-if="normsError" class="text-sm text-slate-600">
      Норми не завантажилися — відхилення і стан водності недоступні.
    </p>
    <LoadingSkeleton v-if="pending" label="Завантаження даних…" class="space-y-3">
      <div
        v-for="n in 6"
        :key="n"
        class="h-8 animate-pulse rounded bg-slate-100 motion-reduce:animate-none"
      ></div>
    </LoadingSkeleton>
    <StationList v-else :states="states" />
  </div>
</template>
