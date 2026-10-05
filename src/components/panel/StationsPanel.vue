<script setup lang="ts">
import { useLocale } from '../../composables/useLocale'
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

const { t } = useLocale()
</script>

<template>
  <div class="space-y-4 p-4 sm:p-5">
    <div class="flex items-center justify-between gap-2">
      <h2 id="stations-heading" class="text-xl font-semibold tracking-tight text-ink">
        {{ t.panel.heading }}
        <span class="font-normal text-ink-muted">{{ states.length }}</span>
      </h2>
      <button
        type="button"
        :aria-label="closeLabel"
        :title="closeLabel"
        class="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-fill text-ink-muted transition-colors hover:bg-fill-strong hover:text-ink focus-ring"
        @click="$emit('close')"
      >
        <svg
          viewBox="0 0 24 24"
          class="size-3.5"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
        >
          <path stroke-width="2.5" stroke-linecap="round" d="M7 7l10 10M17 7L7 17" />
        </svg>
      </button>
    </div>
    <BasinFilter />
    <ErrorState
      v-if="dischargeErrorMessage"
      :message="dischargeErrorMessage"
      @retry="$emit('retry')"
    />
    <p v-if="normsError" class="text-sm text-ink-muted">
      {{ t.panel.normsFailed }}
    </p>
    <LoadingSkeleton v-if="pending" :label="t.panel.loading" class="space-y-3">
      <div
        v-for="n in 6"
        :key="n"
        class="h-11 animate-pulse rounded-xl bg-fill motion-reduce:animate-none"
      ></div>
    </LoadingSkeleton>
    <StationList v-else :states="states" />
  </div>
</template>
