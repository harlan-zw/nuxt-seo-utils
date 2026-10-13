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
  },
  compatibilityDate: '2024-08-07',
})
