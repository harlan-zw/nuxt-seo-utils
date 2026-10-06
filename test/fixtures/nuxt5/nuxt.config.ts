import NuxtSeoUtils from 'nuxt-seo-utils'
import NuxtSiteConfig from 'nuxt-site-config'
import NuxtSeoShared from 'nuxtseo-shared'

if (process.env.NUXT_TEST_LANE === 'nuxt5') {
  for (const module of [NuxtSeoUtils, NuxtSiteConfig, NuxtSeoShared]) {
    const metadata = await module.getMeta()
    metadata.compatibility ||= {}
    metadata.compatibility.nuxt = `${metadata.compatibility.nuxt} || 5.0.0-2610052343-36eafab`
  }
}

export default defineNuxtConfig({
  future: { compatibilityVersion: process.env.NUXT_TEST_LANE === 'future5' ? 5 : undefined },
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
