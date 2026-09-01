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

  compatibilityDate: '2024-08-07',
})
