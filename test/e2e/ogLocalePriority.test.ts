import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/basic'),
  nuxtConfig: {
    site: {
      url: 'https://example.com',
      name: 'Test Site',
    },
    modules: [
      resolve('../../src/module'),
    ],
    // @ts-expect-error module config key
    seo: {
      treeShakeUseSeoMeta: false,
    },
    app: {
      head: {
        meta: [
          { property: 'og:locale', content: 'de_AT' },
        ],
      },
    },
  },
})

describe('og:locale priority (harlan-zw/nuxt-seo#525)', () => {
  it('does not override user-defined og:locale', async () => {
    const html = await $fetch('/') as string
    const head = html.match(/<head>([\s\S]*)<\/head>/)?.[1] || ''
    // og:locale set by the user (or i18n) in app.head should take priority
    // over the module's low-priority fallback
    expect(head).toContain('<meta property="og:locale" content="de_AT">')
  }, 30_000)
})
