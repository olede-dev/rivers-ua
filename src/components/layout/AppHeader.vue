<script setup lang="ts">
import { useLocale } from '../../composables/useLocale'
import { useUiStore } from '../../stores/ui'
import LanguageMenu from './LanguageMenu.vue'
import ThemeMenu from './ThemeMenu.vue'

const ui = useUiStore()
const { t } = useLocale()
const logoUrl = `${import.meta.env.BASE_URL}favicon.svg`

const buttonClass =
  'inline-flex size-9 shrink-0 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium text-ink transition-colors hover:bg-fill focus-ring sm:w-auto sm:px-3'
</script>

<template>
  <!-- A floating bar inset from every edge of the window, over whatever scrolls beneath it. -->
  <header
    class="glass sticky top-2 z-20 flex h-14 shrink-0 items-center gap-1 rounded-2xl px-2 shadow-float sm:top-3 sm:gap-1.5 sm:px-3"
  >
    <div class="flex min-w-0 flex-1 items-center gap-3 pl-1">
      <img :src="logoUrl" alt="" class="size-8 shrink-0" width="32" height="32" />
      <div class="min-w-0">
        <h1
          class="truncate text-[15px] leading-tight font-semibold tracking-tight text-ink sm:text-base"
        >
          {{ t.header.title }}<span class="hidden md:inline">{{ t.header.titleSuffix }}</span>
        </h1>
        <p class="truncate text-xs leading-tight text-ink-muted">
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
      <svg
        viewBox="0 0 24 24"
        class="size-[18px]"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
      >
        <path
          stroke-width="1.75"
          stroke-linecap="round"
          :d="ui.sidebarOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 6h16M4 12h16M4 18h16'"
        />
      </svg>
      <span class="hidden sm:inline">{{ t.header.stations }}</span>
    </button>
  </header>
</template>
