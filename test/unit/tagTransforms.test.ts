import type { HeadPlugin, Unhead } from 'unhead/types'
import { compileTags, dynamicValue } from 'unhead/compiled'
import { createHead as createCompiledHead, renderSSRHead as renderCompiledHead } from 'unhead/compiled/server'
import { createHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'
import { createAbsoluteImageUrlsPlugin } from '../../src/runtime/app/logic/absoluteImageUrls'
import { createDerivedTagsPlugin } from '../../src/runtime/app/logic/derivedTagsPlugin'
import { createAbsoluteImageUrlsTransform, createDerivedTagsTransform } from '../../src/runtime/app/logic/tagTransforms'
import { OG_URL_KEY, TWITTER_IMAGE_FALLBACK_KEY } from '../../src/runtime/shared/derivedTagKeys'

const SITE = 'https://example.com'
const resolve = (path: string) => `${SITE}/${path.replace(/^\//, '')}`

// Compiles input once with `count` dynamic values, as the build does
function compile(input: object, count = 0) {
  const result = compileTags(input as any, { dynamicValues: count })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}

type Push = [input: object, values?: unknown[]]

// Renders the same entries on a v3 head with the hook plugin and on a compiled server head with
// the transform. Each compiled entry takes its values, so the memo holds tokens for them.
function renderBoth(entries: Push[], hookPlugin: (head: Unhead<any>) => HeadPlugin, transform: (head: Unhead<any>) => HeadPlugin) {
  const v3 = createHead({ disableDefaults: true })
  v3.use(hookPlugin(v3))
  const compiled = createCompiledHead({ disableDefaults: true })
  compiled.use(transform(compiled))
  for (const [input, values] of entries) {
    let n = 0
    const looseInput = JSON.parse(JSON.stringify(input), (_, value) => typeof value === 'string' && value.includes(dynamicValue(0).charAt(0)) ? values![n++] : value)
    v3.push(looseInput)
    compiled.push(compile(input, values?.length) as any, values ? { values } as any : undefined)
  }
  return { off: renderSSRHead(v3), on: renderCompiledHead(compiled), head: compiled }
}

const canonical = (href: string) => ({ link: [{ rel: 'canonical', href, tagPriority: 'low' }] })
const ogUrl = { meta: [{ property: 'og:url', content: dynamicValue(0), key: OG_URL_KEY, tagPriority: 'low' }] }

describe('derived tags transform', () => {
  const derived = [createDerivedTagsPlugin, createDerivedTagsTransform] as const

  it.each(['https://example.com/a', 'https://example.com/b'])('copies the canonical href %s into the default og:url on the memo', (href) => {
    const { off, on } = renderBoth([
      [canonical(dynamicValue(0)), ['https://example.com/default']],
      [ogUrl, ['https://example.com/default']],
      [{ link: [{ rel: 'canonical', href: dynamicValue(0) }] }, [href]],
    ], ...derived)
    expect(on).toEqual(off)
    expect(on.headTags).toContain(`<meta property="og:url" content="${href}">`)
  })

  it('drops the default og:url when no canonical link renders', () => {
    const { off, on } = renderBoth([[ogUrl, ['https://example.com/']]], ...derived)
    expect(on).toEqual(off)
    expect(on.headTags).not.toContain('og:url')
  })

  it('drops the og:image size and the twitter:image copy of an og:image that lost', () => {
    const publicImage = {
      meta: [
        { property: 'og:image', content: 'https://example.com/og.png' },
        { property: 'og:image:width', content: '1200' },
        { name: 'twitter:image', content: 'https://example.com/og.png', key: `${TWITTER_IMAGE_FALLBACK_KEY}:og.png` },
      ],
    }
    const page = { meta: [{ property: 'og:image', content: dynamicValue(0) }] }
    const { off, on } = renderBoth([[publicImage], [page, ['https://example.com/post.png']]], ...derived)
    expect(on).toEqual(off)
    expect(on.headTags).not.toContain('og:image:width')
    expect(on.headTags).not.toContain('twitter:image')
  })

  it('keeps an og:image size from an entry with no og:image', () => {
    const { off, on } = renderBoth([
      [{ meta: [{ property: 'og:image', content: 'https://example.com/og.png' }] }],
      [{ meta: [{ property: 'og:image:width', content: '1200' }] }],
    ], ...derived)
    expect(on).toEqual(off)
    expect(on.headTags).toContain('og:image:width')
  })

  it('needs no cache key: its output reads only the tags and the entries the tags came from', () => {
    const head = createCompiledHead()
    expect(createDerivedTagsTransform(head).cacheKey).toBeUndefined()
  })
})

describe('absolute image URLs transform', () => {
  const absolute = [
    () => createAbsoluteImageUrlsPlugin(resolve),
    (head: Unhead<any>) => createAbsoluteImageUrlsTransform(head, resolve, SITE),
  ] as const
  const image = { meta: [{ property: 'og:image', content: dynamicValue(0) }, { name: 'twitter:image', content: '/static.png' }] }

  it.each(['/post.png', 'https://cdn.example.com/a.png', '//cdn.example.com/a.png'])('renders %s as the hook plugin does', (url) => {
    const { off, on } = renderBoth([[image, [url]]], ...absolute)
    expect(on).toEqual(off)
    expect(on.headTags).toContain(`content="${SITE}/static.png"`)
  })

  const dynamicImage = { meta: [{ property: 'og:image', content: dynamicValue(0) }] }

  it('keys the memo on the site URL while every image value is absolute', () => {
    const { head } = renderBoth([[dynamicImage, ['https://cdn.example.com/a.png']]], ...absolute)
    expect(createAbsoluteImageUrlsTransform(head, resolve, SITE).cacheKey!(head as any)).toBe(SITE)
  })

  // The memo holds a token for a dynamic value, and `readEntry` cannot tell a dynamic value from
  // a static one, so any relative image value keeps the memo out.
  it('keeps the memo out when an image value is relative', () => {
    const { head } = renderBoth([[dynamicImage, ['/post.png']]], ...absolute)
    expect(createAbsoluteImageUrlsTransform(head, resolve, SITE).cacheKey!(head as any)).toBeNull()
  })
})
