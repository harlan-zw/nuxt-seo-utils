// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'
import { getIconIssues, parseMetaTags, resolveAppUrl } from './tools'

describe('identity icon inspection', () => {
  it('finds semantic icon rel tokens case-insensitively', () => {
    const parsed = parseMetaTags('<link rel="alternate ICON" href="/favicon.ico" sizes="any">')

    expect(parsed.iconLinks).toEqual([{
      rel: 'icon',
      href: '/favicon.ico',
      type: undefined,
      sizes: 'any',
      media: undefined,
    }])
  })

  it('resolves inspected routes within the Nuxt baseURL', () => {
    expect(resolveAppUrl('https://example.com', '/docs/', '/guide')).toBe('https://example.com/docs/guide')
    expect(resolveAppUrl('https://example.com', '/docs/', '/docs/guide')).toBe('https://example.com/docs/guide')
  })

  it('reports invalid runtime bitmap metadata', () => {
    expect(getIconIssues([{
      rel: 'icon',
      href: 'https://example.com/favicon.ico',
      sizes: 'any',
    }])).toEqual(['https://example.com/favicon.ico uses sizes="any", which is reserved for scalable icons.'])
  })
})
