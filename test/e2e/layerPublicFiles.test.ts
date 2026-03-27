import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/basic'),
  nuxtConfig: {
    extends: [
      resolve('../fixtures/basic/test-layer'),
    ],
    site: {
      url: 'https://example.com',
    },
    modules: [
      resolve('../../src/module'),
    ],
    // @ts-expect-error module config key
    seo: {
      treeShakeUseSeoMeta: false,
    },
    i18n: {
      baseUrl: 'https://example.com',
      defaultLocale: 'en',
      locales: [{ code: 'en', language: 'en-US' }],
    },
  },
})

describe('layer public files', () => {
  it('picks up icon from layer public dir', async () => {
    const html = (await $fetch('/')) as string
    const head = html.match(/<head>([\s\S]*)<\/head>/)?.[1]
    expect(head).toContain('<link rel="icon" href="/icon.png"')
  }, 30_000)
})
