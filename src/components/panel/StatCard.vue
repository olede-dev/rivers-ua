<script setup lang="ts">
defineProps<{ label: string; value: string; unit?: string }>()
</script>

<template>
  <div class="rounded-md border border-slate-200 bg-slate-50 p-3">
    <dt class="text-xs text-slate-600">{{ label }}</dt>
    <dd class="mt-1">
      <span class="text-xl font-semibold text-slate-900 tabular-nums">{{ value }}</span>
      <span v-if="unit && value !== '—'" class="ml-1 text-sm text-slate-600">{{ unit }}</span>
      <span v-if="$slots.default" class="mt-1.5 block"><slot /></span>
    </dd>
  </div>
</template>
