import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/route-meta'),
  nuxtConfig: {
    // @ts-expect-error module config key
    seo: {
      tagPriority: 'high',
    },
  },
})

describe('route rule meta priority with tagPriority: high', () => {
  it('route rule seoMeta still overrides seo.meta', async () => {
    const $ = load(await $fetch<string>('/blog/post'))
    expect($('meta[name="author"]').attr('content')).toBe('Blog Author')
  }, 30_000)

  it('page useSeoMeta still overrides route rule seoMeta', async () => {
    const $ = load(await $fetch<string>('/blog/featured'))
    expect($('meta[name="author"]').attr('content')).toBe('Page Author')
  }, 30_000)
})
