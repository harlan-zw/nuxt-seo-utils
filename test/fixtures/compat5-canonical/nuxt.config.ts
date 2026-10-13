import NuxtSeoUtils from '../../../src/module'

export default defineNuxtConfig({
  modules: [NuxtSeoUtils],
  future: {
    compatibilityVersion: 5,
  },
  // The repository `.nuxtrc` turns auto-imports off; app.config.ts relies on them.
  imports: {
    autoImport: true,
  },
  site: {
    url: 'https://example.com',
    env: 'production',
  },
  seo: {
    redirectToCanonicalSiteUrl: true,
  },
  nitro: {
    prerender: {
      routes: ['/'],
    },
  },
  compatibilityDate: '2026-08-10',
})
