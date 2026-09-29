import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, toValue } from 'vue'
import { useBreadcrumbItems } from '../../src/runtime/app/composables/useBreadcrumbItems'

const seoUtilsConfig = { canonicalLowercase: true, canonicalQueryWhitelist: [] as string[] }
const route = { path: '/Blog/My-Post', query: {}, meta: {} }

vi.mock('nuxt/app', () => ({
  useNuxtApp: () => ({ isHydrating: false, hooks: { hook: () => () => {} } }),
  useRoute: () => route,
  useRouter: () => ({ resolve: () => ({ matched: [] }) }),
  useState: (_key: string, init: () => unknown) => ref(init()),
  useRuntimeConfig: () => ({ public: { 'seo-utils': seoUtilsConfig } }),
}))

const defineBreadcrumb = vi.fn((input: unknown) => input)
vi.mock('#imports', () => ({
  defineBreadcrumb: (input: unknown) => defineBreadcrumb(input),
  useSchemaOrg: () => {},
  useI18n: () => ({ t: (_: string, fallback: string) => fallback, te: () => false, strategy: 'no_prefix' }),
}))

vi.mock('#site-config/app/composables/useSiteConfig', () => ({
  useSiteConfig: () => ({ url: 'https://example.com', trailingSlash: false, defaultLocale: 'en' }),
}))

vi.mock('#site-config/app/composables/utils', () => ({
  createSitePathResolver: () => (path: string) => ref(`https://example.com${path}`),
}))

function schemaItemUrls(): Array<string | undefined> {
  const input = defineBreadcrumb.mock.calls.at(-1)![0] as { itemListElement: unknown }
  return (toValue(input.itemListElement) as Array<{ item?: unknown }>).map(item => toValue(item.item) as string | undefined)
}

describe('breadcrumb schema URLs', () => {
  beforeEach(() => {
    defineBreadcrumb.mockClear()
    seoUtilsConfig.canonicalLowercase = true
  })

  it('lowercases BreadcrumbList item URLs like the canonical', () => {
    useBreadcrumbItems()
    expect(schemaItemUrls()).toEqual([
      'https://example.com/',
      'https://example.com/blog',
      'https://example.com/blog/my-post',
    ])
  })

  it('keeps navigation links as authored', () => {
    const items = useBreadcrumbItems()
    expect(items.value.map(item => item.to)).toEqual(['/', '/Blog', '/Blog/My-Post'])
  })

  it('keeps the case when canonicalLowercase is off', () => {
    seoUtilsConfig.canonicalLowercase = false
    useBreadcrumbItems()
    expect(schemaItemUrls()).toEqual([
      'https://example.com/',
      'https://example.com/Blog',
      'https://example.com/Blog/My-Post',
    ])
  })
})
