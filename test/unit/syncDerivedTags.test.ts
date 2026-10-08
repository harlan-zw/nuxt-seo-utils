import type { HeadTag } from '@unhead/vue/types'
import { describe, expect, it } from 'vitest'
import { ogImageEntryIds, syncDerivedTags } from '../../src/runtime/app/logic/syncDerivedTags'
import { OG_URL_KEY, TWITTER_IMAGE_FALLBACK_KEY } from '../../src/runtime/shared/derivedTagKeys'

function meta(property: string, content: string, entry?: number, key?: string): HeadTag {
  return { tag: 'meta', props: { property, content }, _p: entry === undefined ? undefined : entry << 10, key }
}

function canonical(href?: string): HeadTag {
  const props: HeadTag['props'] = { rel: 'canonical' }
  if (href !== undefined)
    props.href = href
  return { tag: 'link', props }
}

describe('derived metadata after head deduplication', () => {
  it('removes dimensions and fallback Twitter images belonging to a replaced OG image', () => {
    const winner = meta('og:image', 'new.png', 2)
    const oldWidth = meta('og:image:width', '100', 1)
    const newWidth = meta('og:image:width', '200', 2)
    const oldTwitter = meta('twitter:image', 'old.png', 1, `${TWITTER_IMAGE_FALLBACK_KEY}:old.png`)
    const explicitTwitter = meta('twitter:image', 'custom.png', 1)
    const entries = ogImageEntryIds([[meta('og:image', 'old.png', 1)], [winner]])

    expect(syncDerivedTags([oldWidth, winner, newWidth, oldTwitter, explicitTwitter], entries))
      .toEqual([winner, newWidth, explicitTwitter])
  })

  it('updates the generated OG URL without changing the input or explicit metadata', () => {
    const generated = meta('og:url', 'old', undefined, OG_URL_KEY)
    const explicit = meta('og:url', 'https://custom.example/')
    const tags = [generated, canonical('https://example.com/page'), explicit]
    const original = structuredClone(tags)

    expect(syncDerivedTags(tags, new Set())).toEqual([
      { ...generated, props: { ...generated.props, content: 'https://example.com/page' } },
      tags[1],
      explicit,
    ])
    expect(tags).toEqual(original)
  })

  it.each([undefined, ''])('omits the generated OG URL when the canonical href is %s', (href) => {
    const explicit = meta('og:url', 'https://custom.example/')
    const link = canonical(href)

    expect(syncDerivedTags([meta('og:url', 'old', undefined, OG_URL_KEY), link, explicit], new Set()))
      .toEqual([link, explicit])
  })

  it('uses the first canonical link when more than one survives', () => {
    const links = [canonical(), canonical('https://later.example/')]

    expect(syncDerivedTags([meta('og:url', 'old', undefined, OG_URL_KEY), ...links], new Set()))
      .toEqual(links)
  })

  it('preserves tags whose image source is unknown and keeps output order', () => {
    const title: HeadTag = { tag: 'title', props: {}, textContent: 'Page' }
    const width = meta('og:image:width', '200')
    const unknownWidth = meta('og:image:height', '100', 9)
    const twitter = meta('twitter:image', 'custom.png', undefined, TWITTER_IMAGE_FALLBACK_KEY)
    const tags = [title, width, unknownWidth, twitter]

    expect(syncDerivedTags(tags, new Set([1]))).toEqual(tags)
  })
})
