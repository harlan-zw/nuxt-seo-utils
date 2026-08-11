import { createResolver } from '@nuxt/kit'
import { $fetch, fetch, setup } from '@nuxt/test-utils/e2e'
import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  dev: true,
  env: {
    NUXT_APP_BASE_URL: '/base',
  },
  rootDir: resolve('../fixtures/basic'),
  nuxtConfig: {
    app: {
      baseURL: '/base',
    },
  },
})

describe('app baseURL', () => {
  it('describes every size packed into favicon.ico', async () => {
    const html = await $fetch<string>('/base')
    const $ = load(html)
    const favicon = $('link[rel="icon"][href="/base/favicon.ico"]')

    expect(favicon.attr('type')).toBe('image/vnd.microsoft.icon')
    expect(favicon.attr('sizes')).toBe('16x16 32x32 48x48')
  })

  it('uses baseURL for route-specific icons', async () => {
    const html = await $fetch<string>('/base/admin')
    const $ = load(html)
    const icon = $('link[rel="icon"][href="/base/admin/icon.svg"]')

    expect(icon.attr('type')).toBe('image/svg+xml')
    expect(icon.attr('sizes')).toBe('any')

    const darkIcon = $('link[rel="icon"][href="/base/admin/icon.dark.svg"]')
    expect(darkIcon.attr('sizes')).toBe('any')
    expect(darkIcon.attr('media')).toBe('(prefers-color-scheme: dark)')
  })

  it.each([
    '/base/admin/icon.svg',
    '/base/admin/icon.dark.svg',
  ])('serves the route-specific icon at %s', async (href) => {
    const response = await fetch(href)

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('<svg')
  })
})
