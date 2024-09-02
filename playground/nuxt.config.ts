import { resolve } from 'pathe'
import { defineNuxtConfig } from 'nuxt/config'
import NuxtSeoExperiments from '../src/module'

export default defineNuxtConfig({
  modules: [
    '@nuxtjs/i18n',
    '@nuxt/ui',
    NuxtSeoExperiments,
  ],

  site: {
    name: 'SEO Experiments',
    url: 'https://nuxtseo.com',
    tagline: 'test',
    debug: true,
  },

  app: {
    head: {
      seoMeta: {
        description: 'Hi, welcome to the %site.env v%app.version of %siteName.',
      },
      templateParams: {
        separator: 'x',
        app: {
          version: '1.3.4',
        },
      },
      title: '%site.tagline',
      // DEV - My page title - My cool site
      titleTemplate: '%s %separator %site.name',
    },
  },

  runtimeConfig: {
    public: {
      envName: process.env.NODE_ENV === 'development' ? 'dev' : 'live',
    },
  },

  routeRules: {
    '/blog/**': {
      seoMeta: { title: 'test' },
    },
  },

  workspaceDir: resolve(__dirname, '../'),
  compatibilityDate: '2024-07-16',
})
