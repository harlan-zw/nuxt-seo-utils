import { describe, expect, it, vi } from 'vitest'

const { defineNuxtPluginMock, injectHeadMock } = vi.hoisted(() => ({
  defineNuxtPluginMock: vi.fn((plugin: any) => plugin),
  injectHeadMock: vi.fn(),
}))

vi.mock('nuxt/app', () => ({ defineNuxtPlugin: defineNuxtPluginMock }))
vi.mock('@unhead/vue', () => ({ injectHead: injectHeadMock }))
vi.mock('#site-config/app/composables/utils', () => ({
  createSitePathResolver: () => (path: string) => `https://example.com${path}`,
}))

async function registerPlugin() {
  const { default: absoluteImageUrlsPlugin } = await import('../../src/runtime/app/plugins/1.absoluteImageUrls.server')
  const use = vi.fn()
  injectHeadMock.mockReturnValue({ use })
  absoluteImageUrlsPlugin.setup!({} as any)
  const hook = use.mock.calls[0]![0].hooks['tags:resolve'] as (ctx: { tags: any[] }) => unknown
  return hook
}

describe('absoluteImageUrls tags:resolve', () => {
  it('converts relative og:image to an absolute URL', async () => {
    const handler = await registerPlugin()
    const tag = { tag: 'meta', props: { property: 'og:image', content: '/image.png' } }
    handler({ tags: [tag] })
    expect(tag.props.content).toBe('https://example.com/image.png')
  })

  it('returns synchronously so Unhead does not warn about an ignored promise (#138)', async () => {
    const handler = await registerPlugin()
    const result = handler({ tags: [{ tag: 'meta', props: { property: 'og:image', content: '/image.png' } }] })
    expect(result).toBeUndefined()
  })
})
