<script setup lang="ts">
import { useLocale } from '../../composables/useLocale'

defineProps<{ message: string }>()
defineEmits<{ retry: [] }>()

const { t } = useLocale()
</script>

<template>
  <div
    role="alert"
    class="flex flex-wrap items-center gap-3 rounded-xl bg-amber-100/80 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/70 dark:text-amber-100"
  >
    {{ message }}
    <button
      type="button"
      class="rounded-full bg-surface px-3 py-1 text-[13px] font-medium text-ink shadow-card transition-colors hover:bg-group focus-ring"
      @click="$emit('retry')"
    >
      {{ t.errors.retry }}
    </button>
  </div>
</template>
