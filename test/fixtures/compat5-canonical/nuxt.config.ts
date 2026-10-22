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
  // i18n auto-installs through optional moduleDependencies when resolvable. Its
  // shared runtime imports `useRuntimeConfig` from `#imports`, which the
  // compatibilityVersion 5 shared context no longer exports.
  i18n: false,
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
