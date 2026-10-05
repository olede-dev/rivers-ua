import { QueryCache, QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import './styles/main.css'

const HOUR_MS = 60 * 60 * 1000

const queryClient = new QueryClient({
  // The single place a failed request is recorded; the UI shows only a friendly message.
  queryCache: new QueryCache({
    onError: (error, query) =>
      console.error(`Query ${JSON.stringify(query.queryKey)} failed`, error),
  }),
  defaultOptions: {
    queries: { staleTime: HOUR_MS, refetchOnWindowFocus: false },
  },
})

createApp(App).use(createPinia()).use(router).use(VueQueryPlugin, { queryClient }).mount('#app')
