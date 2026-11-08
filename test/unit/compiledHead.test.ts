import type { CompiledHeadShapes } from '../../src/build-time/compiledHead'
import type { EntryInput } from '../../src/runtime/app/logic/headEntries'
import { compileTags, dynamicValue, readCompiledEntry } from 'unhead/compiled'
import { createHead as createCompiledHead, renderSSRHead as renderCompiledHead } from 'unhead/compiled/server'
import { createHead, renderSSRHead } from 'unhead/server'
import { unpackMeta } from 'unhead/utils'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { compileHeadShapes } from '../../src/build-time/compiledHead'
import { chooseShape, pushChosenHead } from '../../src/runtime/app/logic/compiledHead'
import { absoluteImageEntries, absoluteImageInput, needsDerivedTags, planDerivedTags, readEntryInputs, settleDerivedTagValues, UNRESOLVED } from '../../src/runtime/app/logic/headEntries'
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

  it('marks an entry that stands for a useSeoMeta call, so other modules read its description', () => {
    const head = createCompiledHead()
    const choose = () => chooseShape(shapes.description, ['A site'], () => ({}))
    pushChosenHead({} as any, head as any, choose, undefined, { seoMeta: true })
    pushChosenHead({} as any, head as any, choose)
    const [description, plain] = [...head.entries.values()].slice(-2).map(entry => readCompiledEntry(entry as any))
    expect(description).toMatchObject({ seoMeta: true })
    expect(plain?.seoMeta).toBeUndefined()
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
  const compiled = (input: Record<string, any>, compiledTags: unknown = []): EntryInput => ({ _tag: 'Compiled', input, compiledTags, priority: false })
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

  it('plans the og:url content from the canonical link that wins', () => {
    // the default canonical link has low priority, so a page link wins
    const defaultLink = compiled({ link: [{ rel: 'canonical', href: 'https://example.com/a', tagPriority: 'low' }] }, defaultCanonicalTags)
    const ogUrl = defaults[1]!
    const page = (href: unknown, tagPriority?: unknown) => compiled({ link: [{ rel: 'canonical', href, tagPriority }] })
    expect(planDerivedTags([defaultLink, ogUrl, page('https://example.com/b')], context)).toEqual({ _tag: 'OgUrl', content: 'https://example.com/b' })
    // of two links with the same weight, the later one wins
    expect(planDerivedTags([defaultLink, ogUrl, page('https://example.com/b'), page('https://example.com/c')], context)).toEqual({ _tag: 'OgUrl', content: 'https://example.com/c' })
    // a lower weight wins over a later link
    expect(planDerivedTags([defaultLink, ogUrl, page('https://example.com/b', 'high'), page('https://example.com/c')], context)).toEqual({ _tag: 'OgUrl', content: 'https://example.com/b' })
    // an entry priority replaces the priority of its tags
    expect(planDerivedTags([{ ...defaultLink, tagPriority: 'critical' } as EntryInput, ogUrl, page('https://example.com/b')], context)).toEqual({ _tag: 'None' })
    expect(planDerivedTags([defaultLink, ogUrl, page('')], context)).toEqual({ _tag: 'OgUrl', content: false })
  })

  it('leaves the og:url to the plugin when only the plugin order or a later step decides it', () => {
    const defaultLink = compiled({ link: [{ rel: 'canonical', href: 'https://example.com/a', tagPriority: 'low' }] }, defaultCanonicalTags)
    const page = (href: unknown, tagPriority?: unknown) => compiled({ link: [{ rel: 'canonical', href, tagPriority }] })
    expect(planDerivedTags([defaultLink, defaults[1]!, page('https://example.com/b', 'after:title')], context)).toEqual({ _tag: 'Plugin' })
    expect(planDerivedTags([defaultLink, defaults[1]!, page('%site.url/b')], context)).toEqual({ _tag: 'Plugin' })
    const lowOgUrl = compiled({ meta: [{ property: 'og:url', content: 'https://example.com/x', tagPriority: 200 }] })
    expect(planDerivedTags([defaultLink, defaults[1]!, lowOgUrl, page('')], context)).toEqual({ _tag: 'Plugin' })
  })

  it('needs no plugin for a canonical link from another entry with the default href', () => {
    expect(needsDerivedTags([...defaults, compiled({ link: [{ rel: 'canonical', href: 'https://example.com/a' }] })], context)).toBe(false)
  })

  it('needs the plugin for a canonical link whose href has not resolved', () => {
    expect(needsDerivedTags([...defaults, compiled({ link: [{ rel: 'canonical', href: UNRESOLVED }] })], context)).toBe(true)
  })

  it('needs the plugin for another canonical link when the default og:url is off', () => {
    const noOgUrl = [defaults[0]!, compiled({ meta: [] })]
    expect(needsDerivedTags([...noOgUrl, compiled({ link: [{ rel: 'canonical', href: 'https://example.com/a' }] })], context)).toBe(true)
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

  const loose = (input: unknown, priority = false): EntryInput => ({ _tag: 'Loose', input, priority })

  it('reads normal input with known head keys as it reads compiled tags', () => {
    expect(needsDerivedTags([...defaults, loose({ templateParams: { a: 'b' } })], context)).toBe(false)
    expect(needsDerivedTags([...defaults, loose({ link: [{ rel: 'alternate', type: 'text/markdown', href: '/index.md' }] })], context)).toBe(false)
    expect(needsDerivedTags([...defaults, loose({ link: [{ rel: 'canonical', href: 'https://other.example.com/' }] })], context)).toBe(true)
    expect(needsDerivedTags([publicImage, ...defaults, loose({ meta: [{ property: 'og:image', content: '/post.png' }] })], context)).toBe(true)
  })

  it('reads the flat meta of a useSeoMeta call with the unpacker it gets', () => {
    const flat = loose({ title: 'Post', _flatMeta: { ogType: 'article', articleTag: ['a', 'b'] } })
    expect(needsDerivedTags([...defaults, flat], { ...context, unpackMeta })).toBe(false)
    expect(needsDerivedTags([publicImage, ...defaults, loose({ _flatMeta: { ogImage: '/a.png' } })], { ...context, unpackMeta })).toBe(true)
    // the client passes none, and keeps its bundle free of the unpacker
    expect(needsDerivedTags([...defaults, flat], context)).toBe(true)
  })

  it('needs the plugin for normal input it cannot read', () => {
    expect(needsDerivedTags([...defaults, loose({ foo: 'bar' })], context)).toBe(true)
    expect(needsDerivedTags([...defaults, loose(() => ({}))], context)).toBe(true)
  })

  it('needs the plugin when an entry priority can change the og:image winner', () => {
    const page = compiled({
      meta: [
        { property: 'og:image', content: '/post.png' },
        { property: 'og:image:width', content: '800' },
        { name: 'twitter:image', content: '/post.png' },
      ],
    })
    expect(needsDerivedTags([publicImage, ...defaults, { ...page, priority: true } as EntryInput], context)).toBe(true)
  })
})

describe('reading head entries under compiler mode', () => {
  it('settles the values of a server entry with a canonical link, and only that entry', () => {
    const head = createCompiledHead()
    const compile = (input: object) => {
      const result = compileTags(input as any, { dynamicValues: 1 })
      if (result._tag !== 'Ok')
        throw new Error('compile failed')
      return result.tags
    }
    head.push(compile({ link: [{ rel: 'canonical', href: dynamicValue(0) }] }) as any, { values: () => ['https://example.com/a'] } as any)
    head.push(compile({ title: dynamicValue(0) }) as any, { values: () => ['Title'] } as any)
    settleDerivedTagValues(head.entries.values() as any)
    const [canonical, title] = [...head.entries.values()].slice(-2).map(entry => readCompiledEntry(entry as any)?.values)
    expect(canonical).toEqual(['https://example.com/a'])
    expect(title).toBeUndefined()
  })

  it('resolves refs and getters of the link and meta tags of normal input', () => {
    const [entry] = readEntryInputs([{ input: ref({ link: [{ rel: 'canonical', href: ref('/a') }], meta: () => [{ name: 'a', content: 'b' }] }) }])
    expect(entry).toEqual({ _tag: 'Loose', input: { link: [{ rel: 'canonical', href: '/a' }], meta: [{ name: 'a', content: 'b' }] }, priority: false })
  })

  it('never calls a getter outside meta and link tags, which may have side effects', () => {
    let calls = 0
    const style = () => {
      calls++
      return 'body{}'
    }
    const getterInput = () => {
      calls++
      return { meta: [] }
    }
    const [entry, getter] = readEntryInputs([{ input: { style: [style], meta: [{ name: 'a', content: () => 'b' }] } }, { input: getterInput }])
    expect(calls).toBe(0)
    expect(entry).toMatchObject({ input: { meta: [{ name: 'a', content: 'b' }] } })
    expect(needsDerivedTags([getter!], { defaultCanonicalTags: [], ogUrlYields: true })).toBe(true)
  })

  it('marks an entry with a tagPriority option', () => {
    const [entry] = readEntryInputs([{ input: { meta: [] }, options: { tagPriority: 'low' } }])
    expect(entry).toMatchObject({ priority: true })
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

describe('absolute image entries under compiler mode', () => {
  const resolve = (path: string) => `https://example.com/${path.replace(/^\//, '')}`

  it('rewrites normal input with a relative image URL', () => {
    const entry = { input: { meta: [{ property: 'og:image', content: ref('/post.png') }] } }
    expect(absoluteImageEntries([entry], resolve)).toEqual([[entry, { meta: [{ property: 'og:image', content: 'https://example.com/post.png' }] }]])
  })

  it('leaves normal input with no image tag alone', () => {
    expect(absoluteImageEntries([{ input: { link: [{ rel: 'alternate', href: '/index.md' }] } }], resolve)).toEqual([])
  })

  it('leaves flat meta without an image alone, and flat meta with a relative image to the plugin', () => {
    expect(absoluteImageEntries([{ input: { _flatMeta: { ogType: 'article', articleTag: ['a'] } } }], resolve, unpackMeta)).toEqual([])
    expect(absoluteImageEntries([{ input: { _flatMeta: { ogImage: 'https://example.com/a.png' } } }], resolve, unpackMeta)).toEqual([])
    expect(absoluteImageEntries([{ input: { _flatMeta: { ogImage: '/a.png' } } }], resolve, unpackMeta)).toBe('Plugin')
  })

  it('leaves normal input it cannot read to the plugin', () => {
    expect(absoluteImageEntries([{ input: { foo: { ogImage: '/a.png' } } }], resolve)).toBe('Plugin')
  })
})
