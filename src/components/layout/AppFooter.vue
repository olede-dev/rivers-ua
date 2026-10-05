<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { useLocale } from '../../composables/useLocale'
import AboutDialog from './AboutDialog.vue'

const { t } = useLocale()
const about = useTemplateRef<InstanceType<typeof AboutDialog>>('about')
</script>

<template>
  <footer
    class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-xs text-slate-600 dark:text-slate-400"
  >
    <p>
      {{ t.footer.dataSource }}
      <a
        class="underline hover:text-slate-900 dark:hover:text-slate-100"
        href="https://open-meteo.com/"
        >Open-Meteo.com</a
      >. {{ t.footer.modelled }}
    </p>
    <button
      type="button"
      class="rounded underline hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:focus-visible:outline-sky-400"
      @click="about?.open()"
    >
      {{ t.footer.about }}
    </button>
    <AboutDialog ref="about" />
  </footer>
</template>
