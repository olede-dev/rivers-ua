<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { useUiStore } from '../../stores/ui'
import AboutDialog from './AboutDialog.vue'

const ui = useUiStore()
const logoUrl = `${import.meta.env.BASE_URL}favicon.svg`
const about = useTemplateRef<InstanceType<typeof AboutDialog>>('about')

const buttonClass =
  'inline-flex size-10 shrink-0 items-center justify-center gap-2 rounded-md text-sm text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 sm:w-auto sm:px-3'
</script>

<template>
  <header
    class="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2 sm:gap-3 sm:px-4"
  >
    <button
      type="button"
      :class="buttonClass"
      aria-controls="stations-sidebar"
      :aria-expanded="ui.sidebarOpen"
      :aria-label="ui.sidebarOpen ? 'Сховати список станцій' : 'Показати список станцій'"
      @click="ui.sidebarOpen = !ui.sidebarOpen"
    >
      <svg viewBox="0 0 24 24" class="size-5" aria-hidden="true" fill="none" stroke="currentColor">
        <path stroke-width="2" stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      <span class="hidden sm:inline">Станції</span>
    </button>

    <div class="flex min-w-0 flex-1 items-center gap-2.5">
      <img :src="logoUrl" alt="" class="size-8 shrink-0" width="32" height="32" />
      <div class="min-w-0">
        <h1 class="truncate text-base leading-tight font-semibold text-slate-900 sm:text-lg">
          Річки України<span class="hidden md:inline"> — стан і прогноз стоку</span>
        </h1>
        <p class="truncate text-xs leading-tight text-slate-600">
          <span class="md:hidden">Стан і прогноз стоку</span>
          <span class="hidden md:inline">Модельні витрати води GloFAS, норма 1991–2020</span>
        </p>
      </div>
    </div>

    <button type="button" :class="buttonClass" aria-label="Про дані" @click="about?.open()">
      <svg viewBox="0 0 24 24" class="size-5" aria-hidden="true" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="9" stroke-width="2" />
        <path stroke-width="2" stroke-linecap="round" d="M12 11v6M12 7.5v.01" />
      </svg>
      <span class="hidden sm:inline">Про дані</span>
    </button>
    <AboutDialog ref="about" />
  </header>
</template>
