import NuxtSeoUtils from 'nuxt-seo-utils'

export default defineNuxtConfig({
  modules: [
    NuxtSeoUtils,
  ],

  seo: {
    debug: true,
    metaDataFiles: false,
  },

  site: {
    name: 'Nuxt 5 SEO Utils',
    url: 'https://nuxt5.example.com',
  },

  compatibilityDate: '2026-06-10',
})
