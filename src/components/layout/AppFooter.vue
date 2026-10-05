<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { useLocale } from '../../composables/useLocale'
import AboutDialog from './AboutDialog.vue'

const { t } = useLocale()
const about = useTemplateRef<InstanceType<typeof AboutDialog>>('about')
</script>

<template>
  <footer
    class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2 pb-1 text-xs text-ink-muted"
  >
    <p>
      {{ t.footer.dataSource }}
      <a class="rounded text-accent-ink hover:underline focus-ring" href="https://open-meteo.com/"
        >Open-Meteo.com</a
      >. {{ t.footer.modelled }}
    </p>
    <button
      type="button"
      class="rounded text-accent-ink hover:underline focus-ring"
      @click="about?.open()"
    >
      {{ t.footer.about }}
    </button>
    <AboutDialog ref="about" />
  </footer>
</template>
