import NuxtSeoUtils from '../../../src/module'

// `test/e2e/redirectsStaticHosts.test.ts` runs `nuxt generate` with `NITRO_PRESET` and `NUXT_APP_BASE_URL`
export default defineNuxtConfig({
  site: {
    url: 'https://example.com',
    name: 'Static Redirects',
  },
  modules: [NuxtSeoUtils],
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
  },
  seo: {
    redirectReviewAfterDays: false,
    redirects: {
      '/old-about': { to: '/about', addedAt: '2026-10-01' },
      '/old-home': { to: '/', statusCode: 308, addedAt: '2026-10-01' },
      '/legacy/**': { to: '/admin/**', addedAt: '2026-10-01' },
      '/docs': { to: '/manual', addedAt: '2026-10-01' },
      '/docs/**': { to: '/handbook/**', addedAt: '2026-10-01' },
      '/elsewhere': { to: 'https://example.org/page', addedAt: '2026-10-01' },
      '/shop/best-seller': { to: '/about', addedAt: '2026-10-01' },
      '/shop/**': { statusCode: 410, addedAt: '2026-10-01' },
      '/spring-sale': { statusCode: 410, addedAt: '2026-10-01' },
    },
  },
  compatibilityDate: '2024-08-07',
})
