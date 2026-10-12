import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { sitemapPaths } from './sitemapPaths'

const { resolve } = createResolver(import.meta.url)
// The root typecheck has no Nuxt Sitemap types, so pass its options through a spread.
const sitemap = { sources: ['/api/__sitemap__/urls-i18n'] }

await setup({
  rootDir: resolve('../fixtures/sitemap'),
  nuxtConfig: {
    i18n: {
      strategy: 'prefix_except_default',
      defaultLocale: 'en',
      locales: [
        { code: 'en', language: 'en-US' },
        { code: 'fr', language: 'fr-FR' },
      ],
    },
    ...{ sitemap },
  },
})

describe('seo.redirects with Nuxt Sitemap and i18n prefixes', () => {
  it('leaves every locale copy of moved and gone URLs out of the sitemap', async () => {
    const paths = await sitemapPaths(path => $fetch<string>(path))
    expect(paths).toEqual(['/about', '/fr/about', '/fr/new-post', '/new-post'])
  })
})
