/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/rivers-ua/',
  plugins: [vue(), tailwindcss()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Stage 0 ships no tests yet; remove once tests/ is populated.
    passWithNoTests: true,
  },
})
