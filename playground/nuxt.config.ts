import { resolve } from 'pathe'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  alias: {
    'nuxt-unhead': resolve(__dirname, '../src/module'),
  },
  modules: [
    'nuxt-unhead',
  ],
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1',
    },
  },
  workspaceDir: resolve(__dirname, '../'),
  imports: {
    autoImport: true,
  },
})
