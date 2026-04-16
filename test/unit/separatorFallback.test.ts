import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const state = vi.hoisted(() => ({
  runtimeConfig: {
    public: {
      'seo-utils': {
        tagPriority: 'low' as const,
        separator: '·',
        titleSeparator: undefined as string | undefined,
        canonicalQueryWhitelist: [] as string[],
        canonicalLowercase: false,
      },
    },
  },
  siteConfig: {
    name: 'My Site',
    url: 'https://example.com',
    defaultLocale: 'en',
  } as Record<string, unknown>,
  pushed: [] as Record<string, unknown>[],
  headed: [] as Record<string, unknown>[],
  seoMeta: [] as Record<string, unknown>[],
  headUse: vi.fn(),
}))

vi.mock('nuxt/app', () => ({
  defineNuxtPlugin: (plugin: unknown) => plugin,
  useRuntimeConfig: () => state.runtimeConfig,
  useRoute: () => ({
    path: '/',
    query: {},
  }),
  useError: () => ref(null),
}))

vi.mock('#site-config/app/composables/useSiteConfig', () => ({
  useSiteConfig: () => state.siteConfig,
}))

vi.mock('#site-config/app/composables/utils', () => ({
  createSitePathResolver: () => (path: string) => ({
    value: `https://example.com${path}`,
  }),
}))

vi.mock('@unhead/vue/plugins', () => ({
  TemplateParamsPlugin: Symbol.for('template-params-plugin'),
}))

vi.mock('@unhead/vue', () => ({
  injectHead: () => ({
    push: (input: Record<string, unknown>) => state.pushed.push(input),
    use: state.headUse,
  }),
  useHead: (input: Record<string, unknown>) => state.headed.push(input),
  useSeoMeta: (input: Record<string, unknown>) => state.seoMeta.push(input),
}))

const siteConfigPluginModule = import('../../src/runtime/app/plugins/siteConfig')
const applyDefaultsModule = import('../../src/runtime/app/logic/applyDefaults')

beforeEach(() => {
  state.runtimeConfig.public['seo-utils'] = {
    tagPriority: 'low',
    separator: '·',
    titleSeparator: undefined,
    canonicalQueryWhitelist: [],
    canonicalLowercase: false,
  }
  state.siteConfig = {
    name: 'My Site',
    url: 'https://example.com',
    defaultLocale: 'en',
  }
  state.pushed = []
  state.headed = []
  state.seoMeta = []
  state.headUse.mockReset()
})

describe('separator fallback', () => {
  it('siteConfig plugin preserves existing runtime separator fallback', async () => {
    const plugin = (await siteConfigPluginModule).default as () => void
    plugin()
    const input = state.pushed[0] as { templateParams: { separator: string, titleSeparator: string } }

    expect(input.templateParams.separator).toBe('·')
    expect(input.templateParams.titleSeparator).toBe('·')
  })

  it('siteConfig plugin prefers explicit site config separator', async () => {
    state.siteConfig.separator = '/'

    const plugin = (await siteConfigPluginModule).default as () => void
    plugin()
    const input = state.pushed[0] as { templateParams: { separator: string, titleSeparator: string } }

    expect(input.templateParams.separator).toBe('/')
    expect(input.templateParams.titleSeparator).toBe('/')
  })

  it('applyDefaults injects separator template params for client title recomputes', async () => {
    const { applyDefaults } = await applyDefaultsModule
    applyDefaults()
    const input = state.headed[0] as {
      templateParams: {
        separator: () => string
        titleSeparator: () => string
      }
      titleTemplate: () => string
    }

    expect(state.headUse).toHaveBeenCalledWith(Symbol.for('template-params-plugin'))
    expect(input.templateParams.separator()).toBe('·')
    expect(input.templateParams.titleSeparator()).toBe('·')
    expect(input.titleTemplate()).toBe('%s %separator %siteName')
  })
})
