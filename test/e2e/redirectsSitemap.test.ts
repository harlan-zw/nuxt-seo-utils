import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { sitemapPaths } from './sitemapPaths'

const { resolve } = createResolver(import.meta.url)

const sitemap = { urls: ['/listed-redirect'] }
const routeRules = { '/listed-redirect': { sitemap: { priority: 0.5 }, headers: { 'x-sitemap-override': 'kept' } } }
await setup({
  rootDir: resolve('../fixtures/sitemap'),
  nuxtConfig: {
    ...{ sitemap, routeRules },
    seo: {
      redirects: { '/listed-redirect': { to: '/new-post', addedAt: '2026-10-01' } },
    },
  },
})

describe('seo.redirects with Nuxt Sitemap', () => {
  it('hides redirects from dynamic sources and keeps an explicit sitemap rule', async () => {
    const paths = await sitemapPaths(path => $fetch<string>(path))
    expect(paths).toEqual(['/about', '/listed-redirect', '/new-post'])
  })
})
