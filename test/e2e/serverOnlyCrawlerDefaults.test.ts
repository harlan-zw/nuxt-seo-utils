import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { load } from 'cheerio'
import { expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/social-tags'),
  nuxtConfig: {
    dev: false,
    site: { description: 'Site description' },
    seo: { serverOnlyCrawlerDefaults: true },
  },
})

const articleMeta = {
  'description': 'Article description',
  'og:title': 'Social article title',
  'og:type': 'article',
}

it('renders page metadata and the website fallback with server-only defaults', async () => {
  const html = load(await $fetch<string>('/article'))
  for (const [name, content] of Object.entries(articleMeta))
    expect(html(`meta[name="${name}"], meta[property="${name}"]`).attr('content')).toBe(content)
  expect(html('link[rel="canonical"]').attr('href')).toBe('https://example.com/article')
  expect(load(await $fetch<string>('/'))('meta[property="og:type"]').attr('content')).toBe('website')
}, 60_000)
