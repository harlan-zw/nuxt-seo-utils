import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const state = vi.hoisted(() => ({
  error: { value: null as Record<string, unknown> | null },
  runtimeConfig: {
    app: { baseURL: '/' },
    public: {
      'seo-utils': {
        tagPriority: 'low' as const,
        separator: '|',
        titleSeparator: undefined as string | undefined,
        canonicalQueryWhitelist: [] as string[],
        canonicalLowercase: false,
        automaticTwitterTags: true,
      },
    },
  },
  siteConfig: {
    name: 'My Site',
    url: 'https://example.com',
    description: 'Site description',
    defaultLocale: 'en-US',
    twitter: '@mysite',
  } as Record<string, unknown>,
  routeRules: {
    head: { meta: [{ name: 'author', content: 'Rule Author' }] },
    seoMeta: { description: 'Rule description' },
    _seoUtilsPageImages: { ogImage: '/page-image.png' },
  } as Record<string, unknown>,
  pushed: [] as Record<string, unknown>[],
  headed: [] as Record<string, unknown>[],
  seoMeta: [] as Record<string, unknown>[],
  stateCalls: 0,
  routeCalls: 0,
  requestEventCalls: 0,
  resolverCalls: 0,
  headUse: vi.fn(),
  headEntries: new Map<number, { _tags?: any[] }>(),
  inferSeoMetaPlugin: vi.fn((opts?: unknown) => ({ key: 'infer-seo-meta', opts })),
  getSiteConfig: vi.fn(() => ({ url: 'https://example.com', env: 'production' })),
  sendRedirect: vi.fn(),
}))

vi.mock('nuxt/app', () => ({
  defineNuxtPlugin: (plugin: unknown) => plugin,
  injectHead: () => ({
    push: (input: Record<string, unknown>) => state.pushed.push(input),
    use: state.headUse,
    entries: state.headEntries,
  }),
  useError: () => state.error,
  useHead: (input: Record<string, unknown>) => state.headed.push(input),
  useSeoMeta: (input: Record<string, unknown>) => state.seoMeta.push(input),
  useRuntimeConfig: () => state.runtimeConfig,
  useRoute: () => {
    state.routeCalls++
    return { path: '/blog/post', query: {}, meta: {}, matched: [] }
  },
  useRequestEvent: () => {
    state.requestEventCalls++
    return { context: { _nitro: { routeRules: state.routeRules } } }
  },
  useState: (_key: string, init: () => unknown) => {
    state.stateCalls++
    return ref(init())
  },
  useNuxtApp: () => ({}),
}))

vi.mock('nuxt/server', () => ({
  defineEventHandler: (handler: unknown) => handler,
  getRequestHeader: () => 'other.example.com',
  sendRedirect: state.sendRedirect,
  createError: (err: unknown) => err,
  useRuntimeConfig: () => state.runtimeConfig,
}))

vi.mock('#site-config/app/composables/useSiteConfig', () => ({
  useSiteConfig: () => state.siteConfig,
}))

vi.mock('#site-config/app/composables/utils', () => ({
  createSitePathResolver: () => {
    state.resolverCalls++
    return (path: string) => ({ value: `https://example.com${path}` })
  },
}))

vi.mock('#site-config/server/composables/getSiteConfig', () => ({
  getSiteConfig: state.getSiteConfig,
}))

vi.mock('#seo-utils-virtual/redirects.mjs', () => ({
  default: [
    { _tag: 'Moved', pattern: { _tag: 'Prefix', prefix: '/' }, to: '/moved/**', statusCode: 301 },
  ],
}))

vi.mock('@unhead/vue/plugins', () => ({
  TemplateParamsPlugin: Symbol.for('template-params-plugin'),
  InferSeoMetaPlugin: state.inferSeoMetaPlugin,
}))

vi.mock('#build/seo-utils-build-options', () => ({
  serverOnlyCrawlerDefaults: false,
}))

const inferSeoMetaModule = import('../../src/runtime/app/plugins/inferSeoMetaPlugin')
const derivedTagsModule = import('../../src/runtime/app/plugins/derivedTags')
const absoluteImageUrlsModule = import('../../src/runtime/app/plugins/1.absoluteImageUrls.server')
const applyDefaultsModule = import('../../src/runtime/app/logic/applyDefaults')
const routeRulesModule = import('../../src/runtime/app/plugins/0.routeRules')
const siteConfigModule = import('../../src/runtime/app/plugins/siteConfig')
const defaultOgTypeModule = import('../../src/runtime/app/plugins/defaultOgType.server')
const pageImagesModule = import('../../src/runtime/app/plugins/pageImages.server')
const titlesModule = import('../../src/runtime/app/plugins/titles')
const titlesWaitI18nModule = import('../../src/runtime/app/plugins/titlesWaitI18n')
const redirectCanonicalModule = import('../../src/runtime/server/middleware/redirectCanonical')
const redirectsModule = import('../../src/runtime/server/middleware/redirects')

beforeEach(() => {
  state.error.value = null
  state.pushed = []
  state.headed = []
  state.seoMeta = []
  state.stateCalls = 0
  state.routeCalls = 0
  state.requestEventCalls = 0
  state.resolverCalls = 0
  state.headUse.mockReset()
  state.headEntries.clear()
  state.inferSeoMetaPlugin.mockClear()
  state.getSiteConfig.mockClear()
  state.sendRedirect.mockClear()
})

describe('ssr error page short-circuits', () => {
  it('inferSeoMetaPlugin skips InferSeoMetaPlugin on SSR error pages while keeping TemplateParamsPlugin', async () => {
    const plugin = (await inferSeoMetaModule).default as () => void

    state.error.value = { statusCode: 404, message: 'Not Found' }
    plugin()
    expect(state.headUse).toHaveBeenCalledTimes(1)
    expect(state.headUse).toHaveBeenCalledWith(Symbol.for('template-params-plugin'))
    expect(state.inferSeoMetaPlugin).not.toHaveBeenCalled()

    state.headUse.mockReset()
    state.error.value = null
    plugin()
    expect(state.inferSeoMetaPlugin).toHaveBeenCalledTimes(1)
    expect(state.headUse).toHaveBeenCalledTimes(2)
  })

  it('derivedTags skips registering its Unhead hook on SSR error pages', async () => {
    const plugin = (await derivedTagsModule).default

    state.error.value = { statusCode: 404, message: 'Not Found' }
    plugin.setup!({} as any)
    expect(state.headUse).not.toHaveBeenCalled()

    state.error.value = null
    plugin.setup!({} as any)
    expect(state.headUse).toHaveBeenCalledTimes(1)
  })

  it('absoluteImageUrls skips resolver creation and hook registration on SSR error pages', async () => {
    const plugin = (await absoluteImageUrlsModule).default as { setup: (nuxtApp: any) => void }

    state.error.value = { statusCode: 404, message: 'Not Found' }
    plugin.setup({ ssrContext: {} })
    expect(state.resolverCalls).toBe(0)
    expect(state.headUse).not.toHaveBeenCalled()

    state.error.value = null
    plugin.setup({ ssrContext: {} })
    expect(state.resolverCalls).toBe(1)
    expect(state.headUse).toHaveBeenCalledTimes(1)
  })

  it('applyDefaults keeps html lang and titleTemplate while skipping canonical and OG/Twitter meta on SSR error pages', async () => {
    const { applyDefaults } = await applyDefaultsModule

    state.error.value = { statusCode: 404, message: 'Not Found' }
    applyDefaults()
    expect(state.routeCalls).toBe(0)
    expect(state.resolverCalls).toBe(0)
    expect(state.seoMeta).toEqual([])
    expect(state.headed).toHaveLength(1)
    const errorHead = state.headed[0] as { htmlAttrs: { lang: () => string }, titleTemplate: () => string, link?: unknown }
    expect(errorHead.htmlAttrs.lang()).toBe('en-US')
    expect(errorHead.titleTemplate()).toBe('%s')
    expect(errorHead.link).toBeUndefined()

    state.headed = []
    state.seoMeta = []
    state.error.value = null
    applyDefaults()
    expect(state.routeCalls).toBe(1)
    expect(state.resolverCalls).toBe(1)
    expect(state.headed).toHaveLength(2)
    expect(state.seoMeta).toHaveLength(3)
    const normalHead = state.headed[0] as { titleTemplate: () => string, link?: unknown[] }
    expect(normalHead.titleTemplate()).toBe('%s %separator %siteName')
    expect(normalHead.link).toHaveLength(1)
  })

  it('siteConfig keeps templateParams but omits default description meta on SSR error pages', async () => {
    const plugin = (await siteConfigModule).default as () => void

    state.error.value = { statusCode: 404, message: 'Not Found' }
    plugin()
    expect(state.pushed).toHaveLength(1)
    expect(state.pushed[0]?.templateParams).toBeDefined()
    expect(state.pushed[0]?.meta).toBeUndefined()

    state.pushed = []
    state.error.value = null
    plugin()
    expect(state.pushed).toHaveLength(1)
    expect(state.pushed[0]?.meta).toEqual([
      { name: 'description', content: '%site.description', tagPriority: 'low' },
    ])
  })

  it('0.routeRules skips state and head registration on SSR error pages', async () => {
    const plugin = (await routeRulesModule).default

    state.error.value = { statusCode: 404, message: 'Not Found' }
    plugin.setup!({} as any)
    expect(state.stateCalls).toBe(0)
    expect(state.requestEventCalls).toBe(0)
    expect(state.headed).toEqual([])
    expect(state.seoMeta).toEqual([])

    state.error.value = null
    plugin.setup!({} as any)
    expect(state.stateCalls).toBe(1)
    expect(state.requestEventCalls).toBe(1)
    expect(state.headed).toHaveLength(1)
    expect(state.seoMeta).toHaveLength(1)
  })

  it('server-only social plugins skip pushing metadata when payload.error is set', async () => {
    const defaultOgType = (await defaultOgTypeModule).default as (nuxtApp: any) => void
    const pageImages = (await pageImagesModule).default as (nuxtApp: any) => void
    const headPush = vi.fn()

    defaultOgType({ payload: { error: { statusCode: 404 } }, ssrContext: { head: { push: headPush } } })
    pageImages({ payload: { error: { statusCode: 404 } } })
    expect(headPush).not.toHaveBeenCalled()
    expect(state.requestEventCalls).toBe(0)
    expect(state.seoMeta).toEqual([])

    defaultOgType({ payload: {}, ssrContext: { head: { push: headPush } } })
    pageImages({ payload: {} })
    expect(headPush).toHaveBeenCalledTimes(1)
    expect(state.requestEventCalls).toBe(1)
    expect(state.seoMeta).toEqual([{ ogImage: '/page-image.png' }])
  })

  it.each([
    ['titles', titlesModule],
    ['titlesWaitI18n', titlesWaitI18nModule],
  ])('%s keeps 404/500 fallback title without touching useRoute and skips non-404/500 errors', async (_name, mod) => {
    const plugin = (await mod).default

    state.error.value = { statusCode: 404, message: 'Page not found' }
    plugin.setup!({} as any)
    expect(state.routeCalls).toBe(0)
    expect(state.headed).toEqual([{ title: '404 - Page not found' }])

    state.headed = []
    state.error.value = { statusCode: 410, message: 'Gone' }
    plugin.setup!({} as any)
    expect(state.routeCalls).toBe(0)
    expect(state.headed).toEqual([])

    state.headed = []
    state.error.value = null
    plugin.setup!({} as any)
    expect(state.routeCalls).toBe(1)
    expect(state.headed).toHaveLength(1)
    expect((state.headed[0] as { title: () => string }).title()).toBe('Post')
  })

  it('server middleware skips internal /__nuxt_error requests', async () => {
    const redirectCanonical = (await redirectCanonicalModule).default as (e: any) => unknown
    const redirects = (await redirectsModule).default as (e: any) => unknown
    const errorEvent = {
      url: new URL('https://other.example.com/__nuxt_error?url=/missing'),
      req: { headers: new Headers() },
      res: { headers: new Headers() },
    }

    redirectCanonical(errorEvent)
    redirects(errorEvent)
    expect(state.getSiteConfig).not.toHaveBeenCalled()
    expect(state.sendRedirect).not.toHaveBeenCalled()
  })
})
