<script setup lang="ts">
defineProps<{ label: string; value: string; unit?: string }>()
</script>

<template>
  <div class="min-w-0 rounded-md border border-slate-200 bg-slate-50 p-2 sm:p-3">
    <dt class="text-xs leading-tight text-slate-600">{{ label }}</dt>
    <dd class="mt-1">
      <span class="text-lg font-semibold text-slate-900 tabular-nums sm:text-xl">{{ value }}</span>
      <span v-if="unit && value !== '—'" class="ml-1 text-xs text-slate-600 sm:text-sm">{{
        unit
      }}</span>
      <span v-if="$slots.default" class="mt-1.5 block"><slot /></span>
    </dd>
  </div>
</template>
