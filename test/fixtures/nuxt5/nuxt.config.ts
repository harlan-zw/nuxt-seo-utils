import NuxtSeoUtils from 'nuxt-seo-utils'
import NuxtSiteConfig from 'nuxt-site-config'
import NuxtSeoShared from 'nuxtseo-shared'
import NuxtSchemaOrg from 'nuxt-schema-org'

if (process.env.NUXT_TEST_LANE === 'nuxt5') {
  for (const module of [NuxtSeoUtils, NuxtSiteConfig, NuxtSeoShared, NuxtSchemaOrg]) {
    const metadata = await module.getMeta()
    metadata.compatibility ||= {}
    metadata.compatibility.nuxt = `${metadata.compatibility.nuxt} || 5.0.0-2610052343-36eafab`
  }
}

export default defineNuxtConfig({
  future: { compatibilityVersion: process.env.NUXT_TEST_LANE === 'future5' ? 5 : undefined },
  modules: [
    NuxtSchemaOrg,
    NuxtSeoUtils,
  ],

  schemaOrg: { enabled: false },

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
