import { createResolver } from '@nuxt/kit'
import { fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/i18n'),
  nuxtConfig: {
    seo: {
      redirects: {
        '/old-about': { to: '/about', addedAt: '2026-10-01' },
        '/es/antiguo': { to: '/es/about', addedAt: '2026-10-01' },
      },
    },
  },
})

const request = (path: string) => fetch(path, { redirect: 'manual', headers: { accept: 'text/html' } })

describe('seo.redirects with i18n prefixes', () => {
  it.each([
    ['/old-about', '/about'],
    ['/fr/old-about', '/fr/about'],
    ['/es/old-about', '/es/about'],
    ['/es/antiguo', '/es/about'],
  ])('redirects %s to %s', async (path, location) => {
    const res = await request(path)
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe(location)
  })

  it('does not copy a prefixed entry under other locales', async () => {
    expect((await request('/fr/es/antiguo')).status).not.toBe(301)
  })
})
