import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useShareLinks } from '../../src/runtime/app/composables/useShareLinks'

vi.mock('nuxt/app', () => ({
  useRoute: () => ({ path: '/Iletisim', query: { page: '2', utm_source: 'x' } }),
  useRuntimeConfig: () => ({
    public: { 'seo-utils': { canonicalQueryWhitelist: ['page'], canonicalLowercase: true } },
  }),
}))

vi.mock('#site-config/app/composables/useSiteConfig', () => ({
  useSiteConfig: () => ({ name: 'Site', currentLocale: 'tr-TR' }),
}))

vi.mock('#site-config/app/composables/utils', () => ({
  createSitePathResolver: () => (path: string) => ref(`https://example.com${path}`),
}))

describe('useShareLinks canonicalUrl', () => {
  it('lowercases with the site locale, like the canonical link', () => {
    // The canonical link uses the locale's lowercase rules: Turkish maps I to dotless ı.
    expect(useShareLinks().value.canonicalUrl).toBe(`https://example.com/${'Iletisim'.toLocaleLowerCase('tr-TR')}?page=2`)
  })
})
