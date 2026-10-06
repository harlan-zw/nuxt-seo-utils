import { createResolver } from '@nuxt/kit'
import { fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/basic'),
  nuxtConfig: {
    site: {
      name: 'My Site',
      url: 'https://example.com',
    },
    modules: [
      resolve('../../src/module'),
    ],
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

describe('error page title (#54)', () => {
  it('preserves user-defined title without titleTemplate on error pages', async () => {
    const res = await fetch('/non-existent-page', {
      headers: { Accept: 'text/html' },
    })
    const html = await res.text()
    const title = html.match(/<title>(.*?)<\/title>/)?.[1]
    // error.vue sets title to "Page Not Found" via useHead
    // The titleTemplate should not wrap the error page title with site name
    expect(title).toBe('Page Not Found')
  }, 30_000)

  it('applies titleTemplate on normal pages', async () => {
    const res = await fetch('/')
    const html = await res.text()
    const title = html.match(/<title>(.*?)<\/title>/)?.[1]
    // Normal pages should have titleTemplate applied with site name
    expect(title).toContain('My Site')
  }, 30_000)
})
