import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { sitemapPaths } from './sitemapPaths'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/sitemap'),
})

describe('seo.redirects with Nuxt Sitemap', () => {
  it('leaves moved and gone URLs out of a dynamic sitemap source', async () => {
    const paths = await sitemapPaths(path => $fetch<string>(path))
    expect(paths).toEqual(['/about', '/new-post'])
  })
})
