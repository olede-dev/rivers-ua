<script setup lang="ts">
defineProps<{
  /** Read by screen readers instead of the grey placeholder. */
  label: string
}>()
</script>

<template>
  <div role="status" aria-busy="true">
    <span class="sr-only">{{ label }}</span>
    <slot>
      <div
        class="h-full animate-pulse rounded bg-slate-100 dark:bg-slate-800 motion-reduce:animate-none"
      ></div>
    </slot>
  </div>
</template>
