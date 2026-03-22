import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useShareLinks } from '../../src/runtime/app/composables/useShareLinks'

vi.mock('nuxt/app', () => ({
  useRoute: vi.fn(() => ({ path: '/blog/my-post', query: {} })),
  useRuntimeConfig: vi.fn(() => ({
    public: {
      'seo-utils': {
        canonicalQueryWhitelist: [],
        canonicalLowercase: false,
      },
    },
  })),
}))

vi.mock('#site-config/app/composables/useSiteConfig', () => ({
  useSiteConfig: vi.fn(() => ({ name: 'My Site' })),
}))

vi.mock('#site-config/app/composables/utils', () => ({
  createSitePathResolver: vi.fn(() => (path: string) => ref(`https://example.com${path}`)),
}))

describe('useShareLinks', () => {
  it('generates links for all 8 platforms by default', () => {
    const links = useShareLinks()
    const platforms = Object.keys(links.value)
    expect(platforms).toEqual(['twitter', 'facebook', 'linkedin', 'whatsapp', 'telegram', 'reddit', 'pinterest', 'email'])
  })

  it('filters to specified platforms', () => {
    const links = useShareLinks({ platforms: ['twitter', 'facebook'] })
    expect(Object.keys(links.value)).toEqual(['twitter', 'facebook'])
  })

  it('generates correct twitter URL', () => {
    const links = useShareLinks({ platforms: ['twitter'] })
    expect(links.value.twitter).toBe(
      'https://twitter.com/intent/tweet?url=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post&text=My%20Site',
    )
  })

  it('generates correct facebook URL', () => {
    const links = useShareLinks({ platforms: ['facebook'] })
    expect(links.value.facebook).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post',
    )
  })

  it('generates correct linkedin URL', () => {
    const links = useShareLinks({ platforms: ['linkedin'] })
    expect(links.value.linkedin).toBe(
      'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post',
    )
  })

  it('generates correct whatsapp URL', () => {
    const links = useShareLinks({ platforms: ['whatsapp'] })
    expect(links.value.whatsapp).toBe(
      'https://wa.me/?text=My%20Site%20https%3A%2F%2Fexample.com%2Fblog%2Fmy-post',
    )
  })

  it('generates correct telegram URL', () => {
    const links = useShareLinks({ platforms: ['telegram'] })
    expect(links.value.telegram).toBe(
      'https://t.me/share/url?url=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post&text=My%20Site',
    )
  })

  it('generates correct reddit URL', () => {
    const links = useShareLinks({ platforms: ['reddit'] })
    expect(links.value.reddit).toBe(
      'https://www.reddit.com/submit?url=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post&title=My%20Site',
    )
  })

  it('generates correct pinterest URL', () => {
    const links = useShareLinks({ platforms: ['pinterest'] })
    expect(links.value.pinterest).toBe(
      'https://pinterest.com/pin/create/button/?url=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post&description=My%20Site',
    )
  })

  it('generates correct email URL', () => {
    const links = useShareLinks({ platforms: ['email'] })
    expect(links.value.email).toBe(
      'mailto:?subject=My%20Site&body=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post',
    )
  })

  it('appends UTM parameters to URL', () => {
    const links = useShareLinks({
      platforms: ['facebook'],
      utm: { utm_source: 'facebook', utm_medium: 'social' },
    })
    // The URL passed to facebook should contain UTM params
    expect(links.value.facebook).toContain('utm_source')
    expect(links.value.facebook).toContain('utm_medium')
  })

  it('uses custom URL override', () => {
    const links = useShareLinks({
      platforms: ['twitter'],
      url: 'https://custom.com/page',
    })
    expect(links.value.twitter).toContain(encodeURIComponent('https://custom.com/page'))
    expect(links.value.twitter).not.toContain(encodeURIComponent('https://example.com'))
  })

  it('uses custom title', () => {
    const links = useShareLinks({
      platforms: ['twitter'],
      title: 'Custom Title',
    })
    expect(links.value.twitter).toContain(encodeURIComponent('Custom Title'))
  })
})
