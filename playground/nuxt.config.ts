import { resolve } from 'pathe'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    resolve(__dirname, '../src/module')
  ],

  app: {
    head: {
      // DEV - My page title - My cool site
      titleTemplate: `%s %titleSeparator %siteName`,
      meta: [
        {
          name: 'description',
          // Hi, welcome to the dev v0.0.0 of Nuxt Playground.
          content: 'Hi, welcome to the %envName v%app.version of %siteName.',
        }
      ]
    }
  },

  runtimeConfig: {
    public: {
      siteUrl: 'https://harlanzw.com', // allows tests to pass
      app: {
        version: '1.3.4',
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

