import NuxtSeoUtils from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSeoUtils,
  ],
  site: {
    url: 'https://example.com',
    name: 'Example',
  },
  seo: {
    treeShakeUseSeoMeta: false,
    meta: {
      author: 'Site Author',
    },
  },
  routeRules: {
    '/blog/**': {
      seoMeta: {
        author: 'Blog Author',
      },
    },
  },
  compatibilityDate: '2024-08-07',
})
