<script setup lang="ts" generic="T extends string | number">
defineProps<{
  /** Accessible name of the group. */
  label: string
  options: readonly { value: T; label: string }[]
}>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div role="group" :aria-label="label" class="inline-flex rounded-[10px] bg-fill p-0.5">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="model === option.value"
      class="rounded-lg px-3 py-1 text-[13px] font-medium transition-colors focus-ring-inset"
      :class="
        model === option.value
          ? 'bg-surface text-ink shadow-card dark:bg-white/20'
          : 'text-ink-muted hover:text-ink'
      "
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
