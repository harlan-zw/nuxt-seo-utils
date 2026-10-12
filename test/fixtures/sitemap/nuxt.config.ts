import NuxtSeoUtils from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSeoUtils,
    '@nuxtjs/sitemap',
  ],

  site: {
    url: 'https://example.com',
  },

  // The workspace .nuxtrc installs @nuxtjs/i18n in every fixture. Without
  // prefixes it adds nothing to paths. The i18n e2e test switches to prefixes.
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'en',
    locales: [{ code: 'en', language: 'en-US' }],
  },

  seo: {
    redirects: {
      '/old-post': { to: '/new-post', addedAt: '2026-10-01' },
      '/spring-sale': { statusCode: 410, addedAt: '2026-10-01' },
    },
  },

  sitemap: {
    excludeAppSources: true,
    sources: ['/api/__sitemap__/urls'],
  },

  compatibilityDate: '2024-08-07',
})
