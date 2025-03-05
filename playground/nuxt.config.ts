import { createResolver } from '@nuxt/kit'
import { defineNuxtConfig } from 'nuxt/config'
import Module from '../src/module'

const resolver = createResolver(import.meta.url)

export default defineNuxtConfig({
  modules: [
    Module,
    '@nuxtjs/i18n',
    '@nuxt/ui',
  ],

  site: {
    name: 'SEO Utils',
    url: 'https://nuxtseo.com',
    tagline: 'test',
    debug: true,
  },

  i18n: {
    baseUrl: 'https://nuxtseo.com',
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    langDir: 'locales/',
    locales: [
      {
        code: 'en',
        language: 'en-US',
        file: resolver.resolve('i18n/locales/en.ts'),
      },
      {
        code: 'es',
        language: 'es-ES',
        file: resolver.resolve('i18n/locales/es.ts'),
      },
      {
        code: 'fr',
        language: 'fr-FR',
        file: resolver.resolve('i18n/locales/fr.ts'),
      },
    ],
  },

  tailwindcss: {
    viewer: false,
  },

  seo: {
    seoMeta: {
      description: 'Hi, welcome to the %site.env v%app.version of %siteName.',
    },
  },

  app: {
    head: {
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
