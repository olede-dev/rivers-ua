<script setup lang="ts">
import { computed } from 'vue'

import { useLocale } from '../../composables/useLocale'
import { LOCALE_NAMES, type Locale } from '../../i18n'
import HeaderMenu from './HeaderMenu.vue'

defineProps<{ buttonClass: string }>()

const OPTIONS = (Object.keys(LOCALE_NAMES) as Locale[]).map((value) => ({
  value,
  label: LOCALE_NAMES[value],
}))

const { locale, t, setLocale } = useLocale()
const model = computed({ get: () => locale.value, set: setLocale })
</script>

<template>
  <HeaderMenu
    v-model="model"
    :button-class="buttonClass"
    menu-id="language-menu"
    :menu-label="t.language.menuLabel"
    :trigger-label="t.language.label"
    :options="OPTIONS"
  >
    <template #icon="{ iconClass, inMenu }">
      <!-- A globe on the trigger only; the items are the language names themselves. -->
      <svg
        v-if="!inMenu"
        viewBox="0 0 24 24"
        :class="iconClass"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    </template>
  </HeaderMenu>
</template>
