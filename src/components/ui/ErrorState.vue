<script setup lang="ts">
import { useLocale } from '../../composables/useLocale'

defineProps<{ message: string }>()
defineEmits<{ retry: [] }>()

const { t } = useLocale()
</script>

<template>
  <div
    role="alert"
    class="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-950 dark:text-amber-100"
  >
    {{ message }}
    <button
      type="button"
      class="rounded border border-amber-400 dark:border-amber-700 bg-white dark:bg-slate-900 px-2 py-1 hover:bg-amber-100 dark:hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-sky-700 dark:focus-visible:outline-sky-400"
      @click="$emit('retry')"
    >
      {{ t.errors.retry }}
    </button>
  </div>
</template>
