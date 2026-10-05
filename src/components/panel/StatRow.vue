<script setup lang="ts">
defineProps<{ label: string; value: string; unit?: string }>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2">
    <dt class="text-sm text-slate-600 dark:text-slate-400">{{ label }}</dt>
    <dd class="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
      <slot />
      <span>
        <span class="text-base font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{{
          value
        }}</span>
        <span
          v-if="unit && value !== '—'"
          class="ml-1 text-sm text-slate-600 dark:text-slate-400"
          >{{ unit }}</span
        >
      </span>
    </dd>
  </div>
</template>
