<script setup lang="ts">
import { useLocale } from '../../composables/useLocale'
import { useUiStore } from '../../stores/ui'
import LanguageMenu from './LanguageMenu.vue'
import ThemeMenu from './ThemeMenu.vue'

const ui = useUiStore()
const { t } = useLocale()
const logoUrl = `${import.meta.env.BASE_URL}favicon.svg`

const buttonClass =
  'inline-flex size-10 shrink-0 items-center justify-center gap-2 rounded-md text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:focus-visible:outline-sky-400 sm:w-auto sm:px-3'
</script>

<template>
  <header
    class="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 sm:gap-3 sm:px-4"
  >
    <div class="flex min-w-0 flex-1 items-center gap-2.5 pl-1 sm:pl-0">
      <img :src="logoUrl" alt="" class="size-8 shrink-0" width="32" height="32" />
      <div class="min-w-0">
        <h1
          class="truncate text-base leading-tight font-semibold text-slate-900 dark:text-slate-100 sm:text-lg"
        >
          {{ t.header.title }}<span class="hidden md:inline">{{ t.header.titleSuffix }}</span>
        </h1>
        <p class="truncate text-xs leading-tight text-slate-600 dark:text-slate-400">
          <span class="md:hidden">{{ t.header.subtitleShort }}</span>
          <span class="hidden md:inline">{{ t.header.subtitleLong }}</span>
        </p>
      </div>
    </div>

    <LanguageMenu :button-class="buttonClass" />
    <ThemeMenu :button-class="buttonClass" />

    <button
      type="button"
      :class="buttonClass"
      aria-controls="stations-sidebar"
      :aria-expanded="ui.sidebarOpen"
      :aria-label="ui.sidebarOpen ? t.header.hideStations : t.header.showStations"
      @click="ui.sidebarOpen = !ui.sidebarOpen"
    >
      <svg viewBox="0 0 24 24" class="size-5" aria-hidden="true" fill="none" stroke="currentColor">
        <path
          stroke-width="2"
          stroke-linecap="round"
          :d="ui.sidebarOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 6h16M4 12h16M4 18h16'"
        />
      </svg>
      <span class="hidden sm:inline">{{ t.header.stations }}</span>
    </button>
  </header>
</template>
