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

  i18n: {
    baseUrl: 'https://nuxtseo.com',
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    langDir: 'locales/',
    locales: [
      {
        code: 'en',
        iso: 'en-US',
        file: 'en.ts',
      },
      {
        code: 'es',
        iso: 'es-ES',
        file: 'es.ts',
      },
      {
        code: 'fr',
        iso: 'fr-FR',
        file: 'fr.ts',
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
      // @ts-expect-error untyped
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
