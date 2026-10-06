import NuxtSeoUtils from 'nuxt-seo-utils'
import NuxtSiteConfig from 'nuxt-site-config'
import NuxtSeoShared from 'nuxtseo-shared'
import NuxtSchemaOrg from 'nuxt-schema-org'

for (const module of [NuxtSeoUtils, NuxtSiteConfig, NuxtSeoShared, NuxtSchemaOrg]) {
  const metadata = await module.getMeta()
  metadata.compatibility ||= {}
  metadata.compatibility.nuxt = `${metadata.compatibility.nuxt} || 5.0.0-2610061032-c7ad8cd`
}

export default defineNuxtConfig({
  workspaceDir: import.meta.dirname,
  imports: { autoImport: true },
  i18n: false,
  vite: { resolve: { dedupe: ['nuxt', 'vue', 'vue-router'] } },
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
