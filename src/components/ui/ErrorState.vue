<script setup lang="ts">
defineProps<{ message: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div
    role="alert"
    class="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
  >
    {{ message }}
    <button
      type="button"
      class="rounded border border-amber-400 bg-white px-2 py-1 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-sky-700"
      @click="$emit('retry')"
    >
      Спробувати ще
    </button>
  </div>
</template>
