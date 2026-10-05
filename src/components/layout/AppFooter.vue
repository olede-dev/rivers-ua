<script setup lang="ts">
import { useTemplateRef } from 'vue'

import AboutDialog from './AboutDialog.vue'

const about = useTemplateRef<InstanceType<typeof AboutDialog>>('about')
</script>

<template>
  <footer
    class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600"
  >
    <p>
      Дані: GloFAS (Copernicus Emergency Management Service) via
      <a class="underline hover:text-slate-900" href="https://open-meteo.com/">Open-Meteo.com</a>.
      Модельні дані.
    </p>
    <button
      type="button"
      class="rounded underline hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
      @click="about?.open()"
    >
      Про дані та методику
    </button>
    <AboutDialog ref="about" />
  </footer>
</template>
