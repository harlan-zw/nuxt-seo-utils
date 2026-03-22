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

  it('generates correct twitter URL', () => {
    const links = useShareLinks()
    expect(links.value.twitter).toBe(
      'https://x.com/intent/tweet?url=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post&text=My%20Site',
    )
  })

  it('generates correct facebook URL', () => {
    const links = useShareLinks()
    expect(links.value.facebook).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post',
    )
  })

  it('generates correct linkedin URL', () => {
    const links = useShareLinks()
    expect(links.value.linkedin).toBe(
      'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post',
    )
  })

  it('generates correct whatsapp URL', () => {
    const links = useShareLinks()
    expect(links.value.whatsapp).toBe(
      'https://wa.me/?text=My%20Site%20https%3A%2F%2Fexample.com%2Fblog%2Fmy-post',
    )
  })

  it('generates correct telegram URL', () => {
    const links = useShareLinks()
    expect(links.value.telegram).toBe(
      'https://t.me/share/url?url=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post&text=My%20Site',
    )
  })

  it('generates correct reddit URL', () => {
    const links = useShareLinks()
    expect(links.value.reddit).toBe(
      'https://www.reddit.com/submit?url=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post&title=My%20Site',
    )
  })

  it('generates correct pinterest URL', () => {
    const links = useShareLinks()
    expect(links.value.pinterest).toBe(
      'https://pinterest.com/pin/create/button/?url=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post&description=My%20Site',
    )
  })

  it('generates correct email URL', () => {
    const links = useShareLinks()
    expect(links.value.email).toBe(
      'mailto:?subject=My%20Site&body=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post',
    )
  })

  it('appends UTM parameters to URL', () => {
    const links = useShareLinks({
      utm: { utm_source: 'facebook', utm_medium: 'social' },
    })
    expect(links.value.facebook).toContain('utm_source')
    expect(links.value.facebook).toContain('utm_medium')
  })

  it('uses custom URL override', () => {
    const links = useShareLinks({
      url: 'https://custom.com/page',
    })
    expect(links.value.twitter).toContain(encodeURIComponent('https://custom.com/page'))
    expect(links.value.twitter).not.toContain(encodeURIComponent('https://example.com'))
  })

  it('uses custom title', () => {
    const links = useShareLinks({
      title: 'Custom Title',
    })
    expect(links.value.twitter).toContain(encodeURIComponent('Custom Title'))
  })

  it('includes twitter via param', () => {
    const links = useShareLinks({
      twitter: { via: 'haraborern' },
    })
    expect(links.value.twitter).toContain('&via=haraborern')
  })

  it('includes twitter hashtags', () => {
    const links = useShareLinks({
      twitter: { hashtags: ['nuxt', 'vue'] },
    })
    expect(links.value.twitter).toContain('&hashtags=nuxt%2Cvue')
  })

  it('includes facebook quote and hashtag', () => {
    const links = useShareLinks({
      facebook: { quote: 'Check this out', hashtag: '#nuxt' },
    })
    expect(links.value.facebook).toContain('&quote=Check%20this%20out')
    expect(links.value.facebook).toContain('&hashtag=%23nuxt')
  })

  it('includes pinterest media', () => {
    const links = useShareLinks({
      pinterest: { media: 'https://example.com/image.jpg' },
    })
    expect(links.value.pinterest).toContain('&media=https%3A%2F%2Fexample.com%2Fimage.jpg')
  })
})
