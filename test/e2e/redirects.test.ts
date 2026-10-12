import { createResolver } from '@nuxt/kit'
import { fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/basic'),
  nuxtConfig: {
    seo: {
      redirects: {
        '/old-about': { to: '/about', addedAt: '2026-10-01' },
        '/café': { to: '/about', addedAt: '2026-10-01' },
        '/old-home': { to: '/', statusCode: 308, addedAt: '2026-10-01' },
        '/legacy/**': { to: '/admin/**', addedAt: '2026-10-01' },
        '/first': { to: '/second', addedAt: '2026-10-01' },
        '/second': { to: '/about', addedAt: '2026-10-01' },
        '/spring-sale': { statusCode: 410, addedAt: '2026-03-01', reason: 'The sale ended.' },
      },
    },
  },
})

const request = (path: string) => fetch(path, { redirect: 'manual', headers: { accept: 'text/html' } })

describe('seo.redirects', () => {
  it.each([
    ['/old-about', 301, '/about'],
    ['/old-about/', 301, '/about'],
    ['/old-about?utm_source=news', 301, '/about?utm_source=news'],
    ['/old-home', 308, '/'],
    ['/caf%C3%A9', 301, '/about'],
    ['/legacy/settings', 301, '/admin/settings'],
    ['/first', 301, '/about'],
  ])('redirects %s with %i to %s', async (path, status, location) => {
    const res = await request(path)
    expect(res.status).toBe(status)
    expect(res.headers.get('location')).toBe(location)
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600')
  })

  it('renders the error page with 410 for a gone URL and keeps the reason private', async () => {
    const res = await request('/spring-sale')
    const html = await res.text()
    expect(res.status).toBe(410)
    expect(html).toContain('<h1>Error</h1>')
    expect(html).not.toContain('The sale ended.')
  })

  it('leaves other paths alone', async () => {
    expect((await request('/about')).status).toBe(200)
  })
})
