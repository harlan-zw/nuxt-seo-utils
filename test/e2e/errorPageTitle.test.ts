import { createResolver } from '@nuxt/kit'
import { fetch, setup } from '@nuxt/test-utils/e2e'
import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/basic'),
  nuxtConfig: {
    site: {
      name: 'My Site',
      url: 'https://example.com',
      description: 'My Site Description',
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
  it('preserves user-defined title without titleTemplate and skips SEO meta on error pages', async () => {
    const res = await fetch('/non-existent-page', {
      headers: { Accept: 'text/html' },
    })
    const html = await res.text()
    const $ = load(html)
    // error.vue sets title to "Page Not Found" via useHead
    // The titleTemplate should not wrap the error page title with site name
    expect($('title').text()).toBe('Page Not Found')
    expect($('html').attr('lang')).toBe('en')
    expect($('link[rel="canonical"]')).toHaveLength(0)
    expect($('meta[property="og:title"]')).toHaveLength(0)
    expect($('meta[property="og:description"]')).toHaveLength(0)
    expect($('meta[property="og:url"]')).toHaveLength(0)
    expect($('meta[property="og:locale"]')).toHaveLength(0)
    expect($('meta[property="og:site_name"]')).toHaveLength(0)
    expect($('meta[name="twitter:card"]')).toHaveLength(0)
    expect($('meta[name="description"]')).toHaveLength(0)
  }, 30_000)

  it('applies titleTemplate and SEO meta on normal pages', async () => {
    const res = await fetch('/')
    const html = await res.text()
    const $ = load(html)
    // Normal pages should have titleTemplate applied with site name
    expect($('title').text()).toContain('My Site')
    expect($('link[rel="canonical"]').attr('href')).toBe('https://example.com/')
    expect($('meta[property="og:title"]').attr('content')).toContain('My Site')
    expect($('meta[property="og:type"]').attr('content')).toBe('website')
    expect($('meta[property="og:url"]').attr('content')).toBe('https://example.com/')
    expect($('meta[name="twitter:card"]').attr('content')).toBeTruthy()
  }, 30_000)
})
