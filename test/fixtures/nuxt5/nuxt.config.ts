import NuxtSeoUtils from 'nuxt-seo-utils'
import NuxtSiteConfig from 'nuxt-site-config'
import NuxtSchemaOrg from 'nuxt-schema-org'

// nuxt-schema-org releases before the `^5.0.0-0` range reject Nuxt 5 nightlies.
// Delete this patch once the fixture installs a nuxt-schema-org release with that range.
for (const module of [NuxtSchemaOrg]) {
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
    NuxtSiteConfig,
    NuxtSchemaOrg,
    NuxtSeoUtils,
  ],

  schemaOrg: { enabled: false },

  seo: {
    debug: true,
    metaDataFiles: false,
    redirects: {
      '/old': { to: '/', addedAt: '2026-10-01' },
      '/gone': { statusCode: 410, addedAt: '2026-10-01' },
    },
  },

  site: {
    name: 'Nuxt 5 SEO Utils',
    url: 'https://nuxt5.example.com',
  },

  compatibilityDate: '2026-06-10',
})
