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
      // DEV - My page title - My cool site
      titleTemplate: `%envName %titleSeperator %s %titleSeperator %siteName`,
      meta: [
        {
          name: 'description',
          content: 'Hi, welcome to the %envName v%app.version of %siteName.',
        }
      ]
    }
  },

  runtimeConfig: {
    public: {
      app: {
        version: process.env.npm_package_version,
      },
      titleSeparator: '|',
      envName: process.env.NODE_ENV === 'development' ? 'dev' : 'live',
      siteName: 'Nuxt Playground',
    },
  },

  unhead: {},

  workspaceDir: resolve(__dirname, '../'),
  imports: {
    autoImport: true,
  },
})

