import { describe, expect, it } from 'vitest'
import { validateRendering } from './validateRendering'

describe('indexable client-rendered configuration', () => {
  it('warns when the whole site disables SSR', () => {
    expect(validateRendering({ ssr: false })).toEqual([
      { _tag: 'ClientRendering', level: 'warn', path: '/**' },
    ])
  })

  it('keeps global warnings when only the homepage restores SSR', () => {
    expect(validateRendering({ ssr: false, routeRules: { '/': { ssr: true } } })).toEqual([
      { _tag: 'ClientRendering', level: 'warn', path: '/**' },
    ])
  })

  it('keeps broad warnings when a single child restores SSR', () => {
    expect(validateRendering({ routeRules: {
      '/app/**': { ssr: false },
      '/app/__seo_page__': { ssr: true },
    } })).toEqual([{ _tag: 'ClientRendering', level: 'warn', path: '/app/**' }])
  })

  it('warns for indexable client-only route rules', () => {
    expect(validateRendering({ routeRules: { '/app/**': { ssr: false } } })).toEqual([
      { _tag: 'ClientRendering', level: 'warn', path: '/app/**' },
    ])
  })

  it('honors inherited noindex and explicit SSR restoration', () => {
    expect(validateRendering({ routeRules: {
      '/private/**': { robots: false },
      '/private/app/**': { ssr: false },
      '/public/**': { ssr: true },
    } })).toEqual([])
    expect(validateRendering({ routeRules: { '/**': { ssr: true }, '/public/**': { ssr: true } } })).toEqual([])
    expect(validateRendering({ routeRules: {
      '/app/**': { ssr: false },
      '/app/docs/**': { ssr: true },
    } })).toEqual([{ _tag: 'ClientRendering', level: 'warn', path: '/app/**' }])
  })

  it('cannot restore global client rendering with a route SSR override', () => {
    expect(validateRendering({ ssr: false, routeRules: { '/**': { ssr: true } } })).toEqual([
      { _tag: 'ClientRendering', level: 'warn', path: '/**' },
    ])
  })

  it('honors a child robots override instead of the broader permission', () => {
    expect(validateRendering({ routeRules: {
      '/**': { robots: false, ssr: false },
      '/public/**': { robots: true },
    } })).toEqual([{ _tag: 'ClientRendering', level: 'warn', path: '/public/**' }])
  })

  it('accepts explicitly non-indexable sites and robots noindex values', () => {
    expect(validateRendering({ ssr: false, indexable: false })).toEqual([])
    expect(validateRendering({ ssr: false, routeRules: { '/**': { robots: false } } })).toEqual([])
    expect(validateRendering({ routeRules: {
      '/app/**': { ssr: false, robots: 'noindex, follow' },
      '/private/**': { ssr: false, robots: { noindex: true } },
      '/normalized/**': { ssr: false, robots: { indexable: false, rule: 'noindex, nofollow, noarchive' } },
    } })).toEqual([])
  })

  it('warns when prerendering still disables SSR', () => {
    expect(validateRendering({ routeRules: { '/public/**': { ssr: false, prerender: true } } })).toEqual([
      { _tag: 'ClientRendering', level: 'warn', path: '/public/**' },
    ])
  })

  it('skips API, internal, redirect, proxy, and non-HTML route rules', () => {
    expect(validateRendering({ routeRules: {
      '/api/**': { ssr: false },
      '/_nuxt/**': { ssr: false },
      '/.well-known/**': { ssr: false },
      '/old/**': { ssr: false, redirect: '/new' },
      '/external/**': { ssr: false, proxy: 'https://example.com/**' },
      '/data/**': { ssr: false, headers: { 'content-type': 'application/json' } },
    } })).toEqual([])
  })

  it('avoids duplicate scope warnings when global SSR is disabled', () => {
    expect(validateRendering({ ssr: false, routeRules: { '/app/**': { ssr: false } } })).toEqual([
      { _tag: 'ClientRendering', level: 'warn', path: '/**' },
    ])
  })
})
