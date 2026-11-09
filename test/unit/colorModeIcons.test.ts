import type { ColorModeIconLinks } from '../../src/runtime/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  colorMode: { value: 'light' },
  icons: {
    dark: [{ rel: 'icon', href: '/favicon-dark.svg' }],
    light: [{ rel: 'icon', href: '/favicon-light.svg' }],
  },
  useHead: vi.fn(),
}))

vi.mock('nuxt/app', () => ({
  defineNuxtPlugin: (plugin: unknown) => plugin,
  useHead: state.useHead,
  useNuxtApp: () => ({ $colorMode: state.colorMode }),
  useRuntimeConfig: () => ({
    public: {
      'seo-utils': {
        colorModeIcons: state.icons,
      },
    },
  }),
}))

const pluginModule = import('../../src/runtime/app/plugins/colorModeIcons')

beforeEach(() => {
  state.colorMode.value = 'light'
  state.useHead.mockReset()
})

describe('color mode icon plugin', () => {
  it('updates its head input when the app color mode changes', async () => {
    const plugin = (await pluginModule).default as unknown as { setup: () => void }
    plugin.setup()
    const resolveHead = state.useHead.mock.calls[0]![0] as () => { link: Array<{ href: string }> }

    expect(resolveHead().link[0]?.href).toBe('/favicon-light.svg')
    state.colorMode.value = 'dark'
    expect(resolveHead().link[0]?.href).toBe('/favicon-dark.svg')
  })
})

describe('color mode icons under compiler mode', () => {
  it('renders each color mode as the normal input renders it', async () => {
    const { compileTags, dynamicValue } = await import('unhead/compiled')
    const { createHead: createCompiledHead, renderSSRHead: renderCompiled } = await import('unhead/compiled/server')
    const { createHead, renderSSRHead } = await import('unhead/server')
    const { compileColorModeIcons } = await import('../../src/build-time/compiledHead')
    const { selectColorModeIconLinks } = await import('../../src/runtime/app/logic/colorModeIcons')
    const icons = {
      dark: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon-dark.svg' }, { rel: 'apple-touch-icon', href: '/apple-dark.png' }],
      light: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon-light.svg' }, { rel: 'apple-touch-icon', href: '/apple-light.png' }],
    } as ColorModeIconLinks
    const result = compileColorModeIcons({ compileTags, dynamicValue }, icons)
    if (result._tag !== 'Ok')
      throw new Error(result.reason)
    for (const mode of ['dark', 'light'] as const) {
      const loose = createHead()
      loose.push({ link: selectColorModeIconLinks(icons, mode) })
      const compiled = createCompiledHead()
      compiled.push(result.tags[mode] as any)
      expect(renderCompiled(compiled)).toEqual(renderSSRHead(loose))
    }
  })

  it('patches its compiled tags when the app color mode changes', async () => {
    const tags = { dark: [['link', { href: 'dark' }]], light: [['link', { href: 'light' }]] }
    const { nextTick, reactive } = await import('vue')
    // the color-mode module state is reactive
    const colorMode = reactive({ value: 'light' })
    const patch = vi.fn()
    const push = vi.fn(() => ({ patch, dispose: vi.fn() }))
    vi.doMock('#nuxt-seo-utils/compiled-head', () => ({ colorModeIcons: tags }))
    vi.doMock('nuxt/app', () => ({
      defineNuxtPlugin: (plugin: unknown) => plugin,
      injectHead: () => ({ push }),
      useNuxtApp: () => ({ $colorMode: colorMode }),
    }))
    const plugin = (await import('../../src/runtime/app/plugins/compiled/colorModeIcons')).default as unknown as { setup: (nuxtApp: unknown) => void }
    plugin.setup({ hooks: { hook: vi.fn() } })
    expect(push).toHaveBeenCalledWith(tags.light, { values: [] })
    colorMode.value = 'dark'
    await nextTick()
    expect(patch).toHaveBeenCalledWith(tags.dark, { values: [] })
  })
})
