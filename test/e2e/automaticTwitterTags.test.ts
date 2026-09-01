import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/basic'),
  nuxtConfig: {
    modules: [
      resolve('../../src/module'),
    ],
    // @ts-expect-error module config key
    seo: {
      automaticTwitterTags: false,
      treeShakeUseSeoMeta: false,
    },
    app: {
      head: {
        title: 'Open Graph only',
        meta: [
          { name: 'description', content: 'Open Graph description' },
        ],
      },
    },
  },
})

describe('automatic Twitter tags', () => {
  it('keeps Open Graph inference when Twitter tags are disabled', async () => {
    const html = await $fetch<string>('/')
    const $ = load(html)

    expect($('meta[property="og:title"]').attr('content')).toContain('Open Graph only')
    expect($('meta[property="og:description"]').attr('content')).toBe('Open Graph description')
    expect($('meta[name="twitter:card"]')).toHaveLength(0)
  }, 30_000)
})
