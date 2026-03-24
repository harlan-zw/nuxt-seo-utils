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
    const share = useShareLinks()
    const platforms = Object.keys(share.value).filter(k => k !== 'canonicalUrl')
    expect(platforms).toEqual(['twitter', 'facebook', 'linkedin', 'whatsapp', 'telegram', 'reddit', 'pinterest', 'email'])
  })

  it('includes auto UTM by default', () => {
    const share = useShareLinks()
    const twitterUrl = decodeURIComponent(share.value.twitter)
    expect(twitterUrl).toContain('utm_source=twitter')
    expect(twitterUrl).toContain('utm_medium=social')
  })

  it('generates correct twitter URL', () => {
    const share = useShareLinks({ utm: false })
    expect(share.value.twitter).toBe(
      'https://x.com/intent/tweet?url=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post&text=My%20Site',
    )
  })

  it('generates correct facebook URL', () => {
    const share = useShareLinks({ utm: false })
    expect(share.value.facebook).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post',
    )
  })

  it('generates correct linkedin URL', () => {
    const share = useShareLinks({ utm: false })
    expect(share.value.linkedin).toBe(
      'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post',
    )
  })

  it('generates correct whatsapp URL', () => {
    const share = useShareLinks({ utm: false })
    expect(share.value.whatsapp).toBe(
      'https://wa.me/?text=My%20Site%20https%3A%2F%2Fexample.com%2Fblog%2Fmy-post',
    )
  })

  it('generates correct telegram URL', () => {
    const share = useShareLinks({ utm: false })
    expect(share.value.telegram).toBe(
      'https://t.me/share/url?url=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post&text=My%20Site',
    )
  })

  it('generates correct reddit URL', () => {
    const share = useShareLinks({ utm: false })
    expect(share.value.reddit).toBe(
      'https://www.reddit.com/submit?url=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post&title=My%20Site',
    )
  })

  it('generates correct pinterest URL', () => {
    const share = useShareLinks({ utm: false })
    expect(share.value.pinterest).toBe(
      'https://pinterest.com/pin/create/button/?url=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post&description=My%20Site',
    )
  })

  it('generates correct email URL', () => {
    const share = useShareLinks({ utm: false })
    expect(share.value.email).toBe(
      'mailto:?subject=My%20Site&body=https%3A%2F%2Fexample.com%2Fblog%2Fmy-post',
    )
  })

  it('utm: false disables UTM params', () => {
    const share = useShareLinks({ utm: false })
    expect(share.value.twitter).not.toContain('utm_')
  })

  it('appends manual UTM parameters to URL', () => {
    const share = useShareLinks({
      utm: { source: 'facebook', medium: 'social' },
    })
    const decoded = decodeURIComponent(share.value.facebook)
    expect(decoded).toContain('utm_source=facebook')
    expect(decoded).toContain('utm_medium=social')
  })

  it('uses custom URL override', () => {
    const share = useShareLinks({
      url: 'https://custom.com/page',
    })
    expect(share.value.twitter).toContain(encodeURIComponent('https://custom.com/page'))
    expect(share.value.twitter).not.toContain(encodeURIComponent('https://example.com'))
  })

  it('uses custom title', () => {
    const share = useShareLinks({
      title: 'Custom Title',
    })
    expect(share.value.twitter).toContain(encodeURIComponent('Custom Title'))
  })

  it('includes twitter via param', () => {
    const share = useShareLinks({
      twitter: { via: 'haraborern' },
    })
    expect(share.value.twitter).toContain('&via=haraborern')
  })

  it('includes twitter hashtags without #', () => {
    const share = useShareLinks({
      twitter: { hashtags: ['nuxt', 'vue'] },
    })
    expect(share.value.twitter).toContain('&hashtags=nuxt%2Cvue')
  })

  it('includes facebook quote and hashtag (adds # internally)', () => {
    const share = useShareLinks({
      facebook: { quote: 'Check this out', hashtag: 'nuxt' },
    })
    expect(share.value.facebook).toContain('&quote=Check%20this%20out')
    expect(share.value.facebook).toContain('&hashtag=%23nuxt')
  })

  it('includes pinterest media', () => {
    const share = useShareLinks({
      pinterest: { media: 'https://example.com/image.jpg' },
    })
    expect(share.value.pinterest).toContain('&media=https%3A%2F%2Fexample.com%2Fimage.jpg')
  })

  it('exposes canonicalUrl without UTM params', () => {
    const share = useShareLinks()
    expect(share.value.canonicalUrl).toBe('https://example.com/blog/my-post')
  })

  it('exposes custom url override in canonicalUrl', () => {
    const share = useShareLinks({ url: 'https://custom.com/page' })
    expect(share.value.canonicalUrl).toBe('https://custom.com/page')
  })

  it('auto UTM sets correct medium per platform', () => {
    const share = useShareLinks({ utm: true })
    const twitterUrl = decodeURIComponent(share.value.twitter)
    expect(twitterUrl).toContain('utm_source=twitter')
    expect(twitterUrl).toContain('utm_medium=social')
    const fbUrl = decodeURIComponent(share.value.facebook)
    expect(fbUrl).toContain('utm_source=facebook')
    expect(fbUrl).toContain('utm_medium=social')
    const emailUrl = decodeURIComponent(share.value.email)
    expect(emailUrl).toContain('utm_source=email')
    expect(emailUrl).toContain('utm_medium=email')
  })

  it('source: auto behaves like utm: true with additional params', () => {
    const share = useShareLinks({
      utm: { source: 'auto', campaign: 'launch' },
    })
    const twitterUrl = decodeURIComponent(share.value.twitter)
    expect(twitterUrl).toContain('utm_source=twitter')
    expect(twitterUrl).toContain('utm_medium=social')
    expect(twitterUrl).toContain('utm_campaign=launch')
    const emailUrl = decodeURIComponent(share.value.email)
    expect(emailUrl).toContain('utm_source=email')
    expect(emailUrl).toContain('utm_medium=email')
    expect(emailUrl).toContain('utm_campaign=launch')
  })

  it('source: auto with explicit medium uses that medium', () => {
    const share = useShareLinks({
      utm: { source: 'auto', medium: 'referral' },
    })
    const twitterUrl = decodeURIComponent(share.value.twitter)
    expect(twitterUrl).toContain('utm_source=twitter')
    expect(twitterUrl).toContain('utm_medium=referral')
  })

  it('manual utm source string applies to all platforms', () => {
    const share = useShareLinks({
      utm: { source: 'newsletter', campaign: 'launch' },
    })
    const twitterUrl = decodeURIComponent(share.value.twitter)
    expect(twitterUrl).toContain('utm_source=newsletter')
    expect(twitterUrl).toContain('utm_campaign=launch')
    expect(twitterUrl).not.toContain('utm_medium')
  })
})
