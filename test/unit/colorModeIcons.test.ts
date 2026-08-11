import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  colorMode: { value: 'light' },
  icons: {
    dark: [{ rel: 'icon', href: '/favicon-dark.svg' }],
    light: [{ rel: 'icon', href: '/favicon-light.svg' }],
  },
  useHead: vi.fn(),
}))

vi.mock('#imports', () => ({
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
    const plugin = (await pluginModule).default as { setup: () => void }
    plugin.setup()
    const resolveHead = state.useHead.mock.calls[0]![0] as () => { link: Array<{ href: string }> }

    expect(resolveHead().link[0]?.href).toBe('/favicon-light.svg')
    state.colorMode.value = 'dark'
    expect(resolveHead().link[0]?.href).toBe('/favicon-dark.svg')
  })
})
