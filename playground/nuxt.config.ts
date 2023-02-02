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
      titleTemplate: `%envName %pageTitle %titleSeparator %siteName`,
      viewport: 'width=device-width, initial-scale=1',
    },
  },


  runtimeConfig: {
    public: {
      envName: process.env.NODE_ENV === 'development' ? 'DEV' : '',
      siteName: 'Nuxt Playground',
    },
  },

  unhead: {},

  workspaceDir: resolve(__dirname, '../'),
  imports: {
    autoImport: true,
  },
})

