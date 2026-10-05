<script setup lang="ts">
import { useTemplateRef } from 'vue'

import AboutDialog from './AboutDialog.vue'

const about = useTemplateRef<InstanceType<typeof AboutDialog>>('about')
</script>

<template>
  <header
    class="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3"
  >
    <div>
      <h1 class="text-lg font-semibold text-slate-900">Річки України — стан і прогноз стоку</h1>
      <p class="text-sm text-slate-600">Модельні витрати води GloFAS, норма 1991–2020</p>
    </div>
    <button
      type="button"
      class="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
      @click="about?.open()"
    >
      Про дані
    </button>
    <AboutDialog ref="about" />
  </header>
</template>
