import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/page-dir-images'),
})

async function head(path: string) {
  return load(await $fetch<string>(path))
}

describe('pages dir images', () => {
  it('renders one og:image on the route that holds the file', async () => {
    const $ = await head('/about')
    expect($('meta[property="og:image"]').toArray().map(e => $(e).attr('content'))).toEqual(['https://example.com/about/og-image.png'])
    expect($('meta[property="og:image:alt"]').toArray().map(e => $(e).attr('content'))).toEqual(['About alt'])
    expect($('meta[property="og:image:width"]')).toHaveLength(1)
  }, 30_000)

  it('renders one og:image on a child route', async () => {
    const $ = await head('/about/x')
    expect($('meta[property="og:image"]').toArray().map(e => $(e).attr('content'))).toEqual(['https://example.com/about/og-image.png'])
    expect($('meta[property="og:image:alt"]')).toHaveLength(1)
  }, 30_000)

  it('a nested image replaces the parent image and its alt text', async () => {
    const $ = await head('/about/team')
    expect($('meta[property="og:image"]').toArray().map(e => $(e).attr('content'))).toEqual(['https://example.com/about/team/og-image.png'])
    expect($('meta[property="og:image:width"]').attr('content')).toBe('1200')
    expect($('meta[property="og:image:alt"]')).toHaveLength(0)
  }, 30_000)
})
