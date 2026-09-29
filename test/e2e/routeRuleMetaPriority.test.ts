import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/route-meta'),
})

async function head(path: string) {
  return load(await $fetch<string>(path))
}

describe('route rule meta priority', () => {
  it('route rule seoMeta overrides seo.meta', async () => {
    const $ = await head('/blog/post')
    const authors = $('meta[name="author"]')
    expect(authors).toHaveLength(1)
    expect(authors.attr('content')).toBe('Blog Author')
  }, 30_000)

  it('page useSeoMeta overrides route rule seoMeta', async () => {
    const $ = await head('/blog/featured')
    expect($('meta[name="author"]').attr('content')).toBe('Page Author')
  }, 30_000)

  it('pages dir og-image overrides public og-image for its route', async () => {
    const $ = await head('/about')
    expect($('meta[property="og:image"]').attr('content')).toBe('https://example.com/about/og-image.png')
    expect($('meta[property="og:image:width"]').attr('content')).toBe('800')
    expect($('meta[property="og:image:height"]').attr('content')).toBe('400')
    expect($('meta[property="og:image:width"]')).toHaveLength(1)
    // the twitter:image copied from public/og-image.png follows the og:image it copied
    expect($('meta[name="twitter:image"]')).toHaveLength(0)
  }, 30_000)

  it('pages dir og-image applies to child routes', async () => {
    const $ = await head('/about/team')
    expect($('meta[property="og:image"]').attr('content')).toBe('https://example.com/about/og-image.png')
  }, 30_000)

  it('keeps the public og-image on other routes', async () => {
    const $ = await head('/')
    expect($('meta[property="og:image"]').attr('content')).toBe('https://example.com/og-image.png')
    expect($('meta[property="og:image:width"]').attr('content')).toBe('1200')
  }, 30_000)
})
