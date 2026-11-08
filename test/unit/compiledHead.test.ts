import type { CompiledHeadShapes } from '../../src/build-time/compiledHead'
import type { EntryInput } from '../../src/runtime/app/logic/headEntries'
import { compileTags, dynamicValue } from 'unhead/compiled'
import { createHead as createCompiledHead, renderSSRHead as renderCompiledHead } from 'unhead/compiled/server'
import { createHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'
import { compileHeadShapes } from '../../src/build-time/compiledHead'
import { chooseShape } from '../../src/runtime/app/logic/compiledHead'
import { absoluteImageInput, needsDerivedTags } from '../../src/runtime/app/logic/headEntries'
import { chooseClientSiteHead, chooseServerSiteHead } from '../../src/runtime/app/logic/siteHead'
import { compiledHeadShapes } from '../../src/runtime/shared/compiledHeadShapes'
import { OG_URL_KEY, TWITTER_IMAGE_FALLBACK_KEY } from '../../src/runtime/shared/derivedTagKeys'

function compiledShapes(tagPriority: unknown = 'low'): CompiledHeadShapes {
  const result = compileHeadShapes({ compileTags, dynamicValue }, tagPriority)
  if (result._tag !== 'Ok')
    throw new Error(`${result.shape}: ${result.reason}`)
  return result.shapes
}

// The head the full pipeline renders for normal input, next to the head of the compiled choice
function renderBoth(looseInput: object, choice: ReturnType<typeof chooseShape>) {
  const loose = createHead()
  loose.push(looseInput as any)
  const compiled = createCompiledHead()
  if (choice._tag === 'Compiled')
    compiled.push(choice.tags as any, { values: choice.values })
  else
    compiled.push(choice.input as any)
  return [renderSSRHead(loose), renderCompiledHead(compiled)]
}

describe('compiled default head entries', () => {
  const shapes = compiledShapes()
  const cases: [keyof typeof compiledHeadShapes, unknown[]][] = [
    ['lang', ['en-US']],
    ['titleTemplate', []],
    ['errorTitleTemplate', []],
    ['canonical', ['https://example.com/a']],
    ['canonical', [false]],
    ['ogLocale', ['en_US']],
    ['ogLocale', [false]],
    ['description', ['A site']],
    ['siteMeta', ['My Site']],
    ['siteMeta', [undefined]],
    ['siteMetaTwitter', ['My Site', '@site']],
    ['ogUrl', ['https://example.com/a']],
    ['ogUrl', [false]],
    ['fallbackTitle', ['About']],
    ['fallbackTitle', [null]],
    ['fallbackTitle', ['']],
  ]
  it.each(cases)('renders %s with %j as the normal input renders it', (name, values) => {
    const build = compiledHeadShapes[name] as (...args: unknown[]) => object
    const looseInput = build(...values, 'low')
    const [loose, compiled] = renderBoth(looseInput, chooseShape(shapes[name], values, () => looseInput))
    expect(compiled).toEqual(loose)
  })

  it('uses compiled tags for text and for a value with its own compiled tags', () => {
    expect(chooseShape(shapes.ogUrl, ['https://example.com/'], () => ({}))).toMatchObject({ _tag: 'Compiled', tags: shapes.ogUrl!.tags })
    expect(chooseShape(shapes.ogUrl, [false], () => ({}))).toMatchObject({ _tag: 'Compiled', tags: shapes.ogUrl!.special.false, values: [] })
  })

  it('keeps normal input for a value that compiled tags would render another way', () => {
    expect(chooseShape(shapes.fallbackTitle, ['true'], () => ({ title: 'true' }))).toEqual({ _tag: 'Loose', input: { title: 'true' } })
    expect(chooseShape(undefined, ['About'], () => ({ title: 'About' }))).toEqual({ _tag: 'Loose', input: { title: 'About' } })
  })

  it('bails when the module tagPriority is an alias that compiled tags cannot hold', () => {
    expect(compileHeadShapes({ compileTags, dynamicValue }, 'after:title')).toMatchObject({ _tag: 'Bail', shape: 'siteMeta' })
  })
})

describe('site config head', () => {
  const input = { templateParams: { site: { name: 'My Site' }, siteName: 'My Site' } }

  it('compiles each distinct input once and records it for the client', () => {
    const payload = {}
    const first = chooseServerSiteHead(payload, 'defaults', input)
    const second = chooseServerSiteHead({}, 'defaults', structuredClone(input))
    expect(first._tag).toBe('Compiled')
    expect(second).toEqual(first)
    expect((second as { tags: unknown }).tags).toBe((first as { tags: unknown }).tags)
    expect(chooseClientSiteHead(payload, 'defaults', structuredClone(input))).toEqual(first)
  })

  it('keeps normal input on the client when its input differs from the server input', () => {
    const payload = {}
    chooseServerSiteHead(payload, 'defaults', input)
    const changed = { templateParams: { site: { name: 'Mon Site' }, siteName: 'Mon Site' } }
    expect(chooseClientSiteHead(payload, 'defaults', changed)).toEqual({ _tag: 'Loose', input: changed })
    expect(chooseClientSiteHead({}, 'defaults', input)).toEqual({ _tag: 'Loose', input })
  })
})

describe('derived tags under compiler mode', () => {
  const defaultCanonicalTags = ['default canonical']
  const context = { defaultCanonicalTags, ogUrlYields: true }
  const compiled = (input: Record<string, any>, compiledTags: unknown = []): EntryInput => ({ _tag: 'Compiled', input, compiledTags })
  const defaults = [
    compiled({ link: [{ rel: 'canonical', href: 'https://example.com/a' }] }, defaultCanonicalTags),
    compiled({ meta: [{ property: 'og:url', content: 'https://example.com/a', key: OG_URL_KEY }] }),
  ]
  const publicImage = compiled({
    meta: [
      { property: 'og:image', content: 'og-image.png' },
      { property: 'og:image:width', content: '1200' },
      { name: 'twitter:image', content: 'og-image.png', key: `${TWITTER_IMAGE_FALLBACK_KEY}:og-image.png` },
    ],
  })

  it('needs no plugin when the default entries decide every derived tag', () => {
    expect(needsDerivedTags([publicImage, ...defaults, compiled({ title: 'Home' })], context)).toBe(false)
  })

  it('needs the plugin for a canonical link from another entry', () => {
    expect(needsDerivedTags([...defaults, compiled({ link: [{ rel: 'canonical', href: 'https://other.example.com/' }] })], context)).toBe(true)
  })

  it('needs no plugin when that entry also sets an og:url that wins over the default', () => {
    const page = compiled({
      link: [{ rel: 'canonical', href: 'https://other.example.com/' }],
      meta: [{ property: 'og:url', content: 'https://other.example.com/' }],
    })
    expect(needsDerivedTags([...defaults, page], context)).toBe(false)
    expect(needsDerivedTags([...defaults, page], { ...context, ogUrlYields: false })).toBe(true)
  })

  it('needs the plugin when a later og:image leaves tags of the public image in place', () => {
    expect(needsDerivedTags([publicImage, ...defaults, compiled({ meta: [{ property: 'og:image', content: '/post.png' }] })], context)).toBe(true)
  })

  it('needs no plugin when the later og:image replaces every tag of the public image', () => {
    const page = compiled({
      meta: [
        { property: 'og:image', content: '/post.png' },
        { property: 'og:image:width', content: '800' },
        { name: 'twitter:image', content: '/post.png' },
      ],
    })
    expect(needsDerivedTags([publicImage, ...defaults, page], context)).toBe(false)
  })

  it('needs the plugin when an image tag has a priority, which can change the winner', () => {
    const page = compiled({
      meta: [
        { property: 'og:image', content: '/post.png', tagPriority: 'low' },
        { property: 'og:image:width', content: '800' },
        { name: 'twitter:image', content: '/post.png' },
      ],
    })
    expect(needsDerivedTags([publicImage, ...defaults, page], context)).toBe(true)
  })

  it('reads normal input only when it may hold a meta or link tag', () => {
    expect(needsDerivedTags([...defaults, { _tag: 'Loose', input: { templateParams: { a: 'b' } } }], context)).toBe(false)
    expect(needsDerivedTags([...defaults, { _tag: 'Loose', input: { _flatMeta: { ogImage: '/a.png' } } }], context)).toBe(true)
    expect(needsDerivedTags([...defaults, { _tag: 'Loose', input: () => ({}) }], context)).toBe(true)
  })
})

describe('absolute image URLs under compiler mode', () => {
  const resolve = (path: string) => `https://example.com/${path.replace(/^\//, '')}`

  it('makes a relative image URL absolute and leaves other tags as they are', () => {
    const input = {
      title: 'Post',
      meta: [
        { property: 'og:image', content: '/post.png' },
        { name: 'twitter:image', content: 'https://cdn.example.com/a.png' },
        { name: 'description', content: '/not-an-image' },
      ],
    }
    expect(absoluteImageInput(input, resolve)).toEqual({
      title: 'Post',
      meta: [
        { property: 'og:image', content: 'https://example.com/post.png' },
        { name: 'twitter:image', content: 'https://cdn.example.com/a.png' },
        { name: 'description', content: '/not-an-image' },
      ],
    })
  })

  it('changes nothing when every image URL is absolute', () => {
    expect(absoluteImageInput({ meta: [{ property: 'og:image', content: 'https://example.com/a.png' }] }, resolve)).toBeUndefined()
  })

  it('leaves an image URL with a template param to the plugin', () => {
    expect(absoluteImageInput({ meta: [{ property: 'og:image', content: '%site.url/a.png' }] }, resolve)).toBe('Plugin')
  })
})
