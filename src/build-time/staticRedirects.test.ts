import type { Redirects } from './redirects'
import type { NativeHost } from './staticRedirects'
import { describe, expect, it } from 'vitest'
import { planRedirects, toRedirectRules } from './redirects'
import { planNativeRedirects, resolveStaticHost } from './staticRedirects'

const rules = (input: Redirects) => toRedirectRules(planRedirects(input, { now: new Date('2026-10-13'), reviewAfterDays: false }).entries)
const plan = (input: Redirects, host: NativeHost, ctx = { baseURL: '/', errorPage: true }) => planNativeRedirects(rules(input), host, ctx)

describe('resolveStaticHost', () => {
  it.each([
    ['netlify-static', '/', 'Netlify'],
    ['netlify-static', '/base/', 'MetaRefresh'],
    ['cloudflare-pages-static', '/base/', 'CloudflarePages'],
    ['vercel-static', '/base/', 'Vercel'],
    ['github-pages', '/', 'MetaRefresh'],
  ])('serves %s with app.baseURL %s through %s', (preset, baseURL, tag) => {
    expect(resolveStaticHost(preset, baseURL)._tag).toBe(tag)
  })
})

describe('planNativeRedirects', () => {
  const gone: Redirects = {
    '/sale': { statusCode: 410, addedAt: '2026-10-01' },
    '/draft': { statusCode: 404, addedAt: '2026-10-01' },
  }

  it('lists every gone URL when the build has no 404.html to serve', () => {
    const result = plan(gone, { _tag: 'Netlify' }, { baseURL: '/', errorPage: false })
    expect(result.output).toEqual({ _tag: 'RouteRules', redirects: [] })
    expect(result.unserved).toEqual({ _tag: 'NoErrorPage', sources: ['/sale', '/draft'] })
  })

  it('lists only 410 entries on Cloudflare Pages, whose 404 page already serves a 404 entry', () => {
    expect(plan(gone, { _tag: 'CloudflarePages' }).unserved).toEqual({ _tag: 'NoGoneStatus', sources: ['/sale'] })
  })

  it('moves a whole site to another domain on Vercel', () => {
    const result = plan({ '/**': { to: 'https://new.example/**', addedAt: '2026-10-01' } }, { _tag: 'Vercel' })
    expect(result.output).toMatchObject({
      _tag: 'VercelRoutes',
      routes: [
        { src: '^/$', status: 301, headers: { Location: 'https://new.example' } },
        { src: '^/(.*)$', status: 301, headers: { Location: 'https://new.example/$1' } },
      ],
    })
  })

  it('escapes regular expression characters in a Vercel source', () => {
    const result = plan({ '/feed.xml': { to: '/rss.xml', addedAt: '2026-10-01' } }, { _tag: 'Vercel' })
    expect(result.output).toMatchObject({ routes: [{ src: '^/feed\\.xml/?$', headers: { Location: '/rss.xml' } }] })
  })
})
