import { VueQueryPlugin, type VueQueryPluginOptions } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import './styles/main.css'

const HOUR_MS = 60 * 60 * 1000

const vueQueryOptions: VueQueryPluginOptions = {
  queryClientConfig: {
    defaultOptions: {
      queries: { staleTime: HOUR_MS, refetchOnWindowFocus: false },
    },
  },
}

createApp(App).use(createPinia()).use(router).use(VueQueryPlugin, vueQueryOptions).mount('#app')
