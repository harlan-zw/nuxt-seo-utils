import NuxtSeoUtils from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSeoUtils,
    '@nuxt/test-utils/module',
  ],

  nitro: {
    prerender: {
      failOnError: false,
    },
  },

  app: {
    head: {
      htmlAttrs: {
        lang: 'fr',
      },
    },
  },

  compatibilityDate: '2024-08-07',
})
