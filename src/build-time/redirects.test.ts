import type { Redirects } from './redirects'
import { describe, expect, it } from 'vitest'
import { appendSearch, createRedirectMatcher, resolveTarget } from '../runtime/shared/redirects'
import { expandLocalePrefixes, formatRedirectReport, planRedirects, resolveLocalePrefixes, toRedirectRules } from './redirects'

const now = new Date('2026-10-13T12:00:00Z')
const plan = (input: Redirects, reviewAfterDays: number | false = 365) => planRedirects(input, { now, reviewAfterDays })
const targets = (input: Redirects) => Object.fromEntries(plan(input).entries.map(e => [e.source, e._tag === 'Moved' ? `${e.statusCode} ${e.to}` : String(e.statusCode)]))
const tags = (input: Redirects) => plan(input).issues.map(issue => issue._tag)

describe('planRedirects', () => {
  it('serves a moved URL as a 301 unless the entry asks for 308', () => {
    expect(targets({
      '/old': { to: '/new', addedAt: '2026-10-01' },
      '/older': { to: 'https://example.org/page', statusCode: 308, addedAt: '2026-10-01' },
    })).toEqual({ '/old': '301 /new', '/older': '308 https://example.org/page' })
  })

  it('serves a gone URL with its status and no target', () => {
    expect(targets({
      '/sale': { statusCode: 410, addedAt: '2026-10-01' },
      '/draft': { statusCode: 404, addedAt: '2026-10-01' },
    })).toEqual({ '/sale': '410', '/draft': '404' })
  })

  it.each([
    ['no target and no status', { addedAt: '2026-10-01' }, 'InvalidTarget'],
    ['a temporary status', { to: '/new', statusCode: 302, addedAt: '2026-10-01' }, 'InvalidStatusCode'],
    ['a relative target', { to: 'new', addedAt: '2026-10-01' }, 'InvalidTarget'],
    ['a protocol-relative target', { to: '//evil.example', addedAt: '2026-10-01' }, 'InvalidTarget'],
  ])('rejects an entry with %s', (_, entry, tag) => {
    const result = plan({ '/old': entry as never })
    expect(result.entries).toEqual([])
    expect(result.issues).toMatchObject([{ _tag: tag, level: 'error', source: '/old' }])
  })

  it.each([
    ['old', 'it must be a path'],
    ['/old?id=1', 'query string'],
    ['/blog/*/old', 'trailing `/**`'],
    ['/blog/:slug', 'trailing `/**`'],
  ])('rejects the source %s', (source, reason) => {
    expect(plan({ [source]: { to: '/new', addedAt: '2026-10-01' } }).issues).toMatchObject([
      { _tag: 'InvalidSource', level: 'error', reason: expect.stringContaining(reason) },
    ])
  })

  it('rejects a gone URL that matches every path', () => {
    expect(tags({ '/**': { statusCode: 410, addedAt: '2026-10-01' } })).toEqual(['InvalidSource'])
  })

  it('rejects a `/**` target on an exact source', () => {
    expect(tags({ '/old': { to: '/new/**', addedAt: '2026-10-01' } })).toEqual(['InvalidTarget'])
  })

  it('keeps serving an entry with a bad date and warns that the review skips it', () => {
    const result = plan({ '/old': { to: '/new', addedAt: '2026-02-31' } })
    expect(result.entries).toHaveLength(1)
    expect(result.issues).toEqual([{ _tag: 'InvalidDate', level: 'warn', source: '/old', field: 'addedAt', value: '2026-02-31' }])
  })
})

describe('redirect chains', () => {
  it('flattens A → B → C so A reaches C in one hop', () => {
    const input: Redirects = {
      '/a': { to: '/b', addedAt: '2026-10-01' },
      '/b': { to: '/c', addedAt: '2026-10-01' },
    }
    expect(targets(input)).toEqual({ '/a': '301 /c', '/b': '301 /c' })
    expect(plan(input).issues).toEqual([{ _tag: 'ChainFlattened', level: 'info', source: '/a', hops: ['/a', '/b', '/c'] }])
  })

  it('flattens through a `/**` source and keeps the query of the first target', () => {
    expect(targets({
      '/promo': { to: '/blog/launch?ref=promo', addedAt: '2026-10-01' },
      '/blog/**': { to: '/articles/**', addedAt: '2026-10-01' },
    })['/promo']).toBe('301 /articles/launch?ref=promo')
  })

  it('merges the query of each hop when it flattens', () => {
    expect(targets({
      '/promo': { to: '/blog/launch?ref=promo#top', addedAt: '2026-10-01' },
      '/blog/launch': { to: '/articles/launch?src=blog', addedAt: '2026-10-01' },
    })['/promo']).toBe('301 /articles/launch?src=blog&ref=promo#top')
  })

  it('flattens one `/**` move into another', () => {
    expect(targets({
      '/a/**': { to: '/b/**', addedAt: '2026-10-01' },
      '/b/**': { to: '/c/**', addedAt: '2026-10-01' },
    })['/a/**']).toBe('301 /c/**')
  })

  it('leaves a `/**` target alone when only part of its subtree moved', () => {
    expect(targets({
      '/a/**': { to: '/b/**', addedAt: '2026-10-01' },
      '/b/x': { to: '/z', addedAt: '2026-10-01' },
    })['/a/**']).toBe('301 /b/**')
  })

  it('reports a loop once as an error', () => {
    const result = plan({
      '/a': { to: '/b', addedAt: '2026-10-01' },
      '/b': { to: '/a', addedAt: '2026-10-01' },
    })
    expect(result.issues).toEqual([{ _tag: 'RedirectLoop', level: 'error', sources: ['/a', '/b', '/a'] }])
  })

  it('reports a `/**` move whose target sits inside its own source as a loop', () => {
    expect(tags({ '/blog/**': { to: '/blog/archive/**', addedAt: '2026-10-01' } })).toEqual(['RedirectLoop'])
  })

  it('warns when a redirect lands on a gone URL', () => {
    expect(plan({
      '/a': { to: '/b', addedAt: '2026-10-01' },
      '/b': { statusCode: 410, addedAt: '2026-10-01' },
    }).issues).toEqual([{ _tag: 'TargetGone', level: 'warn', source: '/a', to: '/b', statusCode: 410 }])
  })
})

describe('review', () => {
  it('lists an entry once the review window passes since addedAt', () => {
    expect(plan({ '/old': { to: '/new', addedAt: '2025-10-01' } }).issues).toEqual([
      { _tag: 'DueForReview', level: 'warn', source: '/old', target: '/new', since: '2025-10-01', days: 377 },
    ])
  })

  it('restarts the window from reviewedAt', () => {
    expect(tags({ '/old': { to: '/new', addedAt: '2024-01-01', reviewedAt: '2026-06-01' } })).toEqual([])
  })

  it('never lists an entry when the review is off', () => {
    expect(plan({ '/old': { to: '/new', addedAt: '2001-01-01' } }, false).issues).toEqual([])
  })

  it('tells the owner how to keep or remove an entry that is due', () => {
    const report = formatRedirectReport(plan({ '/spring-sale': { statusCode: 410, addedAt: '2025-03-01' } }).issues, 365)
    expect(report.error).toBeUndefined()
    expect(report.warn).toContain('1 `seo.redirects` entry is due for review (older than 365 days):')
    expect(report.warn).toContain('`/spring-sale` → 410 (since 2025-03-01, 591 days)')
    expect(report.warn).toContain('set `reviewedAt` to today')
  })
})

describe('request matching', () => {
  const rules = toRedirectRules(plan({
    '/blog/**': { to: '/articles/**', addedAt: '2026-10-01' },
    '/blog/archive/**': { statusCode: 410, addedAt: '2026-10-01' },
    '/blog/keep': { to: '/articles/kept', addedAt: '2026-10-01' },
  }).entries)
  const match = createRedirectMatcher(rules)

  it.each([
    ['/blog/post', '/articles/post'],
    ['/blog/post/', '/articles/post'],
    ['/blog', '/articles'],
    ['/blog/keep', '/articles/kept'],
  ])('redirects %s to %s', (path, to) => {
    const rule = match(path)
    expect(rule?._tag === 'Moved' && resolveTarget(rule, path)).toBe(to)
  })

  it('prefers the longest prefix', () => {
    expect(match('/blog/archive/2019')).toMatchObject({ _tag: 'Gone', statusCode: 410 })
  })

  it('ignores paths no entry covers', () => {
    expect(match('/blogroll')).toBeUndefined()
  })

  it.each([
    ['/new', '?utm_source=x', '/new?utm_source=x'],
    ['/new?ref=a#top', '?utm_source=x', '/new?ref=a&utm_source=x#top'],
    ['/new', '', '/new'],
  ])('appends the request query to %s', (target, search, result) => {
    expect(appendSearch(target, search)).toBe(result)
  })
})

describe('locale prefixes', () => {
  const rules = toRedirectRules(plan({
    '/old': { to: '/new', addedAt: '2026-10-01' },
    '/fr/ancien': { to: '/fr/nouveau', addedAt: '2026-10-01' },
    '/sale/**': { statusCode: 410, addedAt: '2026-10-01' },
    '/away': { to: 'https://example.org', addedAt: '2026-10-01' },
  }).entries)

  it('skips the default locale with prefix_except_default', () => {
    expect(resolveLocalePrefixes({ strategy: 'prefix_except_default', defaultLocale: 'en', locales: [{ code: 'en' }, { code: 'fr' }] })).toEqual(['/fr'])
    expect(resolveLocalePrefixes({ strategy: 'no_prefix', defaultLocale: 'en', locales: [{ code: 'en' }, { code: 'fr' }] })).toEqual([])
  })

  it('copies each entry under every prefix and keeps prefixed entries as written', () => {
    const match = createRedirectMatcher(expandLocalePrefixes(rules, ['/fr']))
    const moved = (path: string) => {
      const rule = match(path)
      return rule?._tag === 'Moved' ? resolveTarget(rule, path) : rule?.statusCode
    }
    expect(moved('/fr/old')).toBe('/fr/new')
    expect(moved('/fr/sale/item')).toBe(410)
    expect(moved('/fr/away')).toBe('https://example.org')
    expect(moved('/fr/fr/ancien')).toBeUndefined()
  })

  it('lets an explicit locale entry win over a copy', () => {
    const explicit = toRedirectRules(plan({
      '/old': { to: '/new', addedAt: '2026-10-01' },
      '/fr/old': { to: '/fr/nouveau', addedAt: '2026-10-01' },
    }).entries)
    const rule = createRedirectMatcher(expandLocalePrefixes(explicit, ['/fr']))('/fr/old')
    expect(rule?._tag === 'Moved' && rule.to).toBe('/fr/nouveau')
  })
})
