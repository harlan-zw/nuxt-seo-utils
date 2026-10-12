import { createResolver } from '@nuxt/kit'
import { fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  env: {
    NUXT_APP_BASE_URL: '/base',
  },
  rootDir: resolve('../fixtures/basic'),
  nuxtConfig: {
    app: {
      baseURL: '/base',
    },
    seo: {
      redirects: {
        '/old-about': { to: '/about', addedAt: '2026-10-01' },
        '/legacy/**': { to: '/admin/**', addedAt: '2026-10-01' },
        '/elsewhere': { to: 'https://example.org/page', addedAt: '2026-10-01' },
        '/spring-sale': { statusCode: 410, addedAt: '2026-03-01' },
      },
    },
  },
})

const request = (path: string) => fetch(path, { redirect: 'manual', headers: { accept: 'text/html' } })

describe('seo.redirects with app.baseURL', () => {
  it.each([
    ['/base/old-about', '/base/about'],
    ['/base/legacy/settings', '/base/admin/settings'],
    ['/base/elsewhere', 'https://example.org/page'],
  ])('redirects %s to %s', async (path, location) => {
    const res = await request(path)
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe(location)
  })

  it('returns 410 for a gone URL under the base', async () => {
    expect((await request('/base/spring-sale')).status).toBe(410)
  })
})
