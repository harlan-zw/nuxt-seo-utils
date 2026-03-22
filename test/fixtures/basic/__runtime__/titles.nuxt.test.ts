// @vitest-environment nuxt
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

let capturedTitle: (() => string | null) | undefined

const { useRouteMock, useRouterMock, useI18nMock, useErrorMock, useHeadMock } = vi.hoisted(() => {
  return {
    useRouteMock: vi.fn().mockImplementation(() => ({
      path: '/',
      meta: {},
    })),
    useRouterMock: vi.fn().mockImplementation(() => ({
      resolve: vi.fn().mockReturnValue({ matched: [{ name: 'index' }] }),
    })),
    useI18nMock: vi.fn().mockImplementation(() => ({
      t: vi.fn().mockImplementation((_s: string, fallback: string) => fallback),
    })),
    useErrorMock: vi.fn().mockImplementation(() => ref(null)),
    useHeadMock: vi.fn().mockImplementation((input: any) => {
      capturedTitle = input.title
    }),
  }
})

mockNuxtImport('useRoute', () => useRouteMock)
mockNuxtImport('useRouter', () => useRouterMock)
mockNuxtImport('useI18n', () => useI18nMock)
mockNuxtImport('useError', () => useErrorMock)
mockNuxtImport('useHead', () => useHeadMock)

// Import the plugin module once. defineNuxtPlugin in the test env returns the plugin config object.
// We call setup() per test after configuring mocks.
const pluginModule = import('../../../../src/runtime/app/plugins/titles')

async function runPlugin() {
  capturedTitle = undefined
  const mod = await pluginModule
  const plugin = mod.default as any
  // Call setup to wire up the computed + useHead
  plugin.setup()
}

function getTitle(): string | null {
  if (!capturedTitle) throw new Error('useHead was not called')
  return capturedTitle()
}

afterEach(() => {
  vi.restoreAllMocks()
  capturedTitle = undefined
})

describe('fallback titles plugin', () => {
  it('uses URL segment title-case when no i18n translation exists', async () => {
    useRouteMock.mockImplementation(() => ({
      path: '/about-us',
      meta: {},
    }))
    useRouterMock.mockImplementation(() => ({
      resolve: () => ({ matched: [{ name: 'about-us' }] }),
    }))
    useI18nMock.mockImplementation(() => ({
      t: (_key: string, fallback: string) => fallback,
    }))

    await runPlugin()
    expect(getTitle()).toBe('About Us')
  })

  it('uses i18n translation when it exists for the route', async () => {
    useRouteMock.mockImplementation(() => ({
      path: '/about',
      meta: {},
    }))
    useRouterMock.mockImplementation(() => ({
      resolve: () => ({ matched: [{ name: 'about' }] }),
    }))
    useI18nMock.mockImplementation(() => ({
      t: (key: string, fallback: string) => {
        if (key === 'pages.about.title')
          return 'About Our Company'
        return fallback
      },
    }))

    await runPlugin()
    expect(getTitle()).toBe('About Our Company')
  })

  it('strips ___locale suffix from route name for i18n lookup', async () => {
    const tMock = vi.fn().mockImplementation((key: string, fallback: string) => {
      if (key === 'pages.contact.title')
        return 'Contact Translated'
      return fallback
    })

    useRouteMock.mockImplementation(() => ({
      path: '/contact',
      meta: {},
    }))
    useRouterMock.mockImplementation(() => ({
      resolve: () => ({ matched: [{ name: 'contact___en' }] }),
    }))
    useI18nMock.mockImplementation(() => ({ t: tMock }))

    await runPlugin()
    expect(getTitle()).toBe('Contact Translated')
    expect(tMock).toHaveBeenCalledWith('pages.contact.title', 'Contact', expect.anything())
  })

  it('falls back to URL segment when i18n returns empty string', async () => {
    useRouteMock.mockImplementation(() => ({
      path: '/services',
      meta: {},
    }))
    useRouterMock.mockImplementation(() => ({
      resolve: () => ({ matched: [{ name: 'services___fr' }] }),
    }))
    useI18nMock.mockImplementation(() => ({
      t: () => '',
    }))

    await runPlugin()
    expect(getTitle()).toBe('Services')
  })

  it('uses route.meta.title when set', async () => {
    useRouteMock.mockImplementation(() => ({
      path: '/about',
      meta: { title: 'Custom Meta Title' },
    }))
    useRouterMock.mockImplementation(() => ({
      resolve: () => ({ matched: [{ name: 'about' }] }),
    }))

    await runPlugin()
    expect(getTitle()).toBe('Custom Meta Title')
  })

  it('returns null for root path with no meta title', async () => {
    useRouteMock.mockImplementation(() => ({
      path: '/',
      meta: {},
    }))
    useRouterMock.mockImplementation(() => ({
      resolve: () => ({ matched: [{ name: 'index' }] }),
    }))
    useI18nMock.mockImplementation(() => ({
      t: (_key: string, fallback: string) => fallback,
    }))

    await runPlugin()
    expect(getTitle()).toBeNull()
  })
})
