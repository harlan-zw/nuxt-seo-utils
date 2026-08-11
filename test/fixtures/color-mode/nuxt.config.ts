import NuxtSeoUtils from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSeoUtils,
    '@nuxt/ui',
  ],
  colorMode: {
    fallback: 'light',
    preference: 'light',
  },
  seo: {
    treeShakeUseSeoMeta: false,
  },
  compatibilityDate: '2024-08-07',
})
