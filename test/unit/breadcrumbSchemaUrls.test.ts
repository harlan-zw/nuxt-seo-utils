import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, toValue } from 'vue'
import { useBreadcrumbItems } from '../../src/runtime/app/composables/useBreadcrumbItems'

const seoUtilsConfig = { canonicalLowercase: true, canonicalQueryWhitelist: [] as string[] }
const route = { path: '/Blog/My-Post', query: {}, meta: {} }
let appI18n: { locale: string, defaultLocale: string, strategy: string, t: (_: string, fallback: string) => string } | undefined

vi.mock('nuxt/app', () => ({
  useNuxtApp: () => ({ isHydrating: false, hooks: { hook: () => () => {} }, $i18n: appI18n }),
  useRoute: () => route,
  useRouter: () => ({ resolve: () => ({ matched: [] }) }),
  useState: (_key: string, init: () => unknown) => ref(init()),
  useRuntimeConfig: () => ({ public: { 'seo-utils': seoUtilsConfig } }),
}))

const defineBreadcrumb = vi.fn((input: unknown) => input)
vi.mock('#seo-utils-schema', () => ({
  defineBreadcrumb: (input: unknown) => defineBreadcrumb(input),
  useSchemaOrg: () => {},
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
    route.path = '/Blog/My-Post'
    appI18n = undefined
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

  it('uses the active i18n locale for breadcrumb roots', () => {
    route.path = '/fr/Blog/My-Post'
    appI18n = { locale: 'fr', defaultLocale: 'en', strategy: 'prefix_except_default', t: (_key, fallback) => fallback }

    const items = useBreadcrumbItems()

    expect(items.value[0]?.to).toBe('/fr')
  })
})
