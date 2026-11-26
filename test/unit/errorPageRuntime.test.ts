import type { HeadTag } from '@unhead/vue/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OG_URL_KEY } from '../../src/runtime/shared/derivedTagKeys'

const state = vi.hoisted(() => ({
  error: { value: null as Record<string, unknown> | null },
  headUse: vi.fn(),
  headEntries: new Map<number, { _tags?: HeadTag[] }>(),
}))

vi.mock('nuxt/app', () => ({
  defineNuxtPlugin: (plugin: unknown) => plugin,
  injectHead: () => ({
    use: state.headUse,
    entries: state.headEntries,
  }),
  useError: () => state.error,
}))

vi.mock('#site-config/app/composables/utils', () => ({
  createSitePathResolver: () => (path: string) => `https://example.com${path}`,
}))

const derivedTagsModule = import('../../src/runtime/app/plugins/derivedTags')
const absoluteImageUrlsModule = import('../../src/runtime/app/plugins/1.absoluteImageUrls.server')

beforeEach(() => {
  state.error.value = null
  state.headUse.mockReset()
  state.headEntries.clear()
})

describe('client error hydration recovery', () => {
  it('derivedTags skips hook work while an error is active and resumes after clearError', async () => {
    const plugin = (await derivedTagsModule).default
    state.error.value = { statusCode: 404, message: 'Not Found' }
    plugin.setup!({} as any)

    expect(state.headUse).toHaveBeenCalledTimes(1)
    const hook = state.headUse.mock.calls[0]![0].hooks['tags:beforeResolve'] as (ctx: { tags: HeadTag[] }) => void

    const ogUrlTag: HeadTag = { tag: 'meta', props: { property: 'og:url', content: 'old' }, key: OG_URL_KEY }
    const canonicalTag: HeadTag = { tag: 'link', props: { rel: 'canonical', href: 'https://example.com/home' } }
    const errorCtx = { tags: [ogUrlTag, canonicalTag] }
    hook(errorCtx)
    expect(errorCtx.tags[0]?.props.content).toBe('old')

    // Clearing the error (e.g. navigating from 404 to home) re-enables derived tag syncing.
    state.error.value = null
    const normalCtx = { tags: [ogUrlTag, canonicalTag] }
    hook(normalCtx)
    expect(normalCtx.tags[0]?.props.content).toBe('https://example.com/home')
  })

  it('absoluteImageUrls skips rewriting while an error is active and resumes after clearError', async () => {
    const plugin = (await absoluteImageUrlsModule).default
    state.error.value = { statusCode: 404, message: 'Not Found' }
    plugin.setup!({} as any)

    expect(state.headUse).toHaveBeenCalledTimes(1)
    const hook = state.headUse.mock.calls[0]![0].hooks['tags:resolve'] as (ctx: { tags: HeadTag[] }) => void

    const errorTag: HeadTag = { tag: 'meta', props: { property: 'og:image', content: '/image.png' } }
    hook({ tags: [errorTag] })
    expect(errorTag.props.content).toBe('/image.png')

    state.error.value = null
    const normalTag: HeadTag = { tag: 'meta', props: { property: 'og:image', content: '/image.png' } }
    hook({ tags: [normalTag] })
    expect(normalTag.props.content).toBe('https://example.com/image.png')
  })
})
