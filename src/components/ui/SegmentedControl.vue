<script setup lang="ts" generic="T extends string | number">
defineProps<{
  /** Accessible name of the group. */
  label: string
  options: readonly { value: T; label: string }[]
}>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    class="inline-flex rounded-md border border-slate-300 bg-slate-50 p-0.5"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="model === option.value"
      class="rounded px-2.5 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-sky-700"
      :class="
        model === option.value
          ? 'bg-sky-800 text-white shadow-sm'
          : 'text-slate-700 hover:bg-white hover:text-slate-900'
      "
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
