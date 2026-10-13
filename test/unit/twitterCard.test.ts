import type { Unhead } from 'unhead/types'
import { load } from 'cheerio'
import { createHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it, vi } from 'vitest'

const { injectHeadMock, runtimeConfig } = vi.hoisted(() => ({
  injectHeadMock: vi.fn(),
  runtimeConfig: { public: { 'seo-utils': {} as { automaticTwitterTags?: boolean } } },
}))

vi.mock('nuxt/app', () => ({
  defineNuxtPlugin: (plugin: any) => plugin,
  injectHead: injectHeadMock,
  useRuntimeConfig: () => runtimeConfig,
}))

async function createSeoHead(options: { automaticTwitterTags?: boolean } = {}): Promise<Unhead<any>> {
  const { default: derivedTagsPlugin } = await import('../../src/runtime/app/plugins/derivedTags')
  const { default: inferSeoMetaPlugin } = await import('../../src/runtime/app/plugins/inferSeoMetaPlugin')
  const head = createHead()
  runtimeConfig.public['seo-utils'] = options
  injectHeadMock.mockReturnValue(head)
  derivedTagsPlugin.setup!({} as any)
  inferSeoMetaPlugin({} as any)
  // app.head from nuxt.config
  head.push({ title: 'Home', meta: [{ name: 'description', content: 'A page' }] })
  return head
}

async function twitterCards(head: Unhead<any>): Promise<string[]> {
  const { headTags } = await renderSSRHead(head)
  const $ = load(headTags)
  return $('meta[name="twitter:card"]').map((_, el) => $(el).attr('content')).get()
}

describe('inferred twitter:card', () => {
  it('uses summary when the page has no image', async () => {
    const head = await createSeoHead()
    expect(await twitterCards(head)).toEqual(['summary'])
  })

  it('uses summary_large_image when a page adds an og:image', async () => {
    const head = await createSeoHead()
    head.push({ meta: [{ property: 'og:image', content: 'https://example.com/og.png' }] })
    expect(await twitterCards(head)).toEqual(['summary_large_image'])
  })

  it('uses summary_large_image when a page adds only a twitter:image', async () => {
    const head = await createSeoHead()
    head.push({ meta: [{ name: 'twitter:image', content: 'https://example.com/og.png' }] })
    expect(await twitterCards(head)).toEqual(['summary_large_image'])
  })

  it('ignores an og:image with empty content', async () => {
    const head = await createSeoHead()
    head.push({ meta: [{ property: 'og:image', content: '' }] })
    expect(await twitterCards(head)).toEqual(['summary'])
  })

  it('follows the image when it is added, changed, and removed', async () => {
    const head = await createSeoHead()
    expect(await twitterCards(head)).toEqual(['summary'])
    const entry = head.push({ meta: [{ property: 'og:image', content: 'https://example.com/og.png' }] })
    expect(await twitterCards(head)).toEqual(['summary_large_image'])
    entry.patch({ meta: [{ property: 'og:image', content: '' }] })
    expect(await twitterCards(head)).toEqual(['summary'])
    entry.patch({ meta: [{ property: 'og:image', content: 'https://example.com/og.png' }] })
    expect(await twitterCards(head)).toEqual(['summary_large_image'])
    entry.dispose()
    expect(await twitterCards(head)).toEqual(['summary'])
  })

  it('keeps an explicit summary when the page has an og:image', async () => {
    const head = await createSeoHead()
    head.push({ meta: [
      { property: 'og:image', content: 'https://example.com/og.png' },
      { name: 'twitter:card', content: 'summary' },
    ] })
    expect(await twitterCards(head)).toEqual(['summary'])
  })

  it('keeps an explicit summary_large_image when the page has no image', async () => {
    const head = await createSeoHead()
    head.push({ meta: [{ name: 'twitter:card', content: 'summary_large_image' }] })
    expect(await twitterCards(head)).toEqual(['summary_large_image'])
  })

  it('renders one twitter:card next to the tags nuxt-og-image adds', async () => {
    const head = await createSeoHead()
    // Same tags and priority as nuxt-og-image 7 `generateMeta()`.
    head.push({ meta: [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: 'https://example.com/_og/s/og.png' },
      { property: 'og:image', content: 'https://example.com/_og/s/og.png' },
    ] }, { tagPriority: 'high' })
    expect(await twitterCards(head)).toEqual(['summary_large_image'])
  })

  it('adds no twitter:card when automaticTwitterTags is false', async () => {
    const head = await createSeoHead({ automaticTwitterTags: false })
    head.push({ meta: [{ property: 'og:image', content: 'https://example.com/og.png' }] })
    expect(await twitterCards(head)).toEqual([])
  })
})
