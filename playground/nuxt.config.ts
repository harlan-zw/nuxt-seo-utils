import { defineNuxtConfig } from 'nuxt/config'
import Module from '../src/module'

export default defineNuxtConfig({
  modules: [
    '@nuxtjs/i18n',
    '@nuxt/ui',
    Module,
  ],

  site: {
    name: 'SEO Utils',
    url: 'https://nuxtseo.com',
    tagline: 'test',
    debug: true,
  },

  tailwindcss: {
    viewer: false,
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

  typescript: {
    includeWorkspace: true,
  },

  compatibilityDate: '2024-07-16',
})
