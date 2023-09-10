import { resolve } from 'pathe'
import { defineNuxtConfig } from 'nuxt/config'
import NuxtSeoExperiments from '../src/module'

export default defineNuxtConfig({
  modules: [
    '@nuxtjs/i18n',
    '@nuxt/ui',
    'nuxt-icon',
    NuxtSeoExperiments,
  ],

  site: {
    name: 'SEO Experiments',
    tagline: 'test',
  },

  app: {
    seoMeta: {
      description: 'Hi, welcome to the %envName v%app.version of %siteName.',
    },
    head: {
      title: '%site.tagline',
      // DEV - My page title - My cool site
      titleTemplate: '%s %separator %site.name',
    },
  },

  runtimeConfig: {
    public: {
      app: {
        version: '1.3.4',
      },
      titleSeparator: '|',
      envName: process.env.NODE_ENV === 'development' ? 'dev' : 'live',
      siteName: 'Nuxt Playground',
    },
  },

  routeRules: {
    '/blog/**': {
      seoMeta: { title: 'test' },
    },
  },

  workspaceDir: resolve(__dirname, '../'),
  imports: {
    autoImport: true,
  },
})
