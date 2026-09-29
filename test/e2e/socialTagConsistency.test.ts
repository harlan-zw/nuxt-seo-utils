import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/social-tags'),
})

async function head(path: string) {
  return load(await $fetch<string>(path))
}

describe('social tag consistency', () => {
  it('keeps the public og-image tags together', async () => {
    const $ = await head('/')
    expect($('meta[property="og:image"]').attr('content')).toBe('https://example.com/og-image.png')
    expect($('meta[property="og:image:width"]').attr('content')).toBe('1200')
    expect($('meta[name="twitter:image"]').attr('content')).toBe('https://example.com/og-image.png')
    expect($('meta[name="twitter:image:width"]').attr('content')).toBe('1200')
  }, 30_000)

  it('drops the public og-image dimensions when a page sets its own og:image', async () => {
    const $ = await head('/post')
    expect($('meta[property="og:image"]').attr('content')).toBe('https://example.com/post.png')
    expect($('meta[property="og:image:width"]')).toHaveLength(0)
    expect($('meta[property="og:image:height"]')).toHaveLength(0)
    expect($('meta[property="og:image:type"]')).toHaveLength(0)
    expect($('meta[name^="twitter:image"]')).toHaveLength(0)
  }, 30_000)

  it('keeps a page og:image:alt for the site image', async () => {
    const $ = await head('/alt')
    expect($('meta[property="og:image"]').attr('content')).toBe('https://example.com/og-image.png')
    expect($('meta[property="og:image:width"]').attr('content')).toBe('1200')
    expect($('meta[property="og:image:alt"]').attr('content')).toBe('Page alt for the site image')
  }, 30_000)

  it('og:url follows a custom canonical', async () => {
    const $ = await head('/canonical')
    expect($('link[rel="canonical"]').attr('href')).toBe('https://example.com/preferred')
    expect($('meta[property="og:url"]').attr('content')).toBe('https://example.com/preferred')
  }, 30_000)

  it('og:url matches the automatic canonical', async () => {
    const $ = await head('/post')
    expect($('meta[property="og:url"]').attr('content')).toBe('https://example.com/post')
  }, 30_000)
})
