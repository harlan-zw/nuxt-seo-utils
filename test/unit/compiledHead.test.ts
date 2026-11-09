import type { Unhead } from 'unhead/types'
import type { CompiledHeadShapes } from '../../src/build-time/compiledHead'
import type { EntryInput } from '../../src/runtime/app/logic/headEntries'
import { VueResolver } from '@unhead/vue/utils'
import { useSeoMeta } from 'unhead'
import { compileTags, dynamicValue, readEntry } from 'unhead/compiled'
import { createHead as createCompiledHead, renderSSRHead as renderCompiledHead } from 'unhead/compiled/server'
import { createHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { compileHeadShapes } from '../../src/build-time/compiledHead'
import { chooseShape, pushChosenHead, pushServerChosenHead } from '../../src/runtime/app/logic/compiledHead'
import { absoluteImageEntries, absoluteImageInput, needsDerivedTags, planDerivedTags, readEntryInputs } from '../../src/runtime/app/logic/headEntries'
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
    pushChosenHead({} as any, head as any, choose, { seoMeta: true })
    pushChosenHead({} as any, head as any, choose)
    const [description, plain] = [...head.entries.values()].slice(-2).map(entry => readEntry(entry, head))
    expect(description).toMatchObject({ seoMeta: true, compiled: true, input: { meta: [{ name: 'description', content: 'A site' }] } })
    expect(plain?.seoMeta).toBe(false)
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

  it('holds an entry priority in the compiled tags, so the entry renders as with the entry option', () => {
    const loose = createHead()
    loose.push({ templateParams: { separator: '|' } })
    loose.push(input, { tagPriority: 'low' })
    loose.push({ title: '%siteName %separator Home' })
    const choice = chooseServerSiteHead({}, 'defaults', input, 'low')
    expect(choice._tag).toBe('Compiled')
    const compiled = createCompiledHead()
    compiled.push({ templateParams: { separator: '|' } })
    compiled.push((choice as { tags: unknown }).tags as any)
    compiled.push({ title: '%siteName %separator Home' })
    expect(renderCompiledHead(compiled)).toEqual(renderSSRHead(loose))
    expect(chooseServerSiteHead({}, 'defaults', input, 'low')).toEqual(choice)
    expect((chooseServerSiteHead({}, 'defaults', input) as { tags: unknown }).tags).not.toEqual((choice as { tags: unknown }).tags)
  })

  it('pushes the compiled tags of a prioritized entry with no entry options on the server head', () => {
    const head = createCompiledHead()
    const nuxtApp = { hooks: { hook: () => {} } }
    const choice = chooseServerSiteHead({}, 'defaults', input, 'low')
    pushServerChosenHead(nuxtApp as any, head as any, () => choice, { tagPriority: 'low' })
    const entry = [...head.entries.values()].at(-1)
    expect(readEntry(entry!, head)).toMatchObject({ compiled: true, input: { templateParams: input.templateParams } })
    expect(entry!.options).toEqual({})
  })

  it('keeps the priority of normal input that cannot compile on the server head', () => {
    const head = createCompiledHead()
    const nuxtApp = { hooks: { hook: () => {} } }
    pushServerChosenHead(nuxtApp as any, head as any, () => ({ _tag: 'Loose', input }), { tagPriority: 'low' })
    // reading the entries settles the choice, and a reader sees the entry that replaces it
    expect(readEntryInputs(head as any).at(-1)).toMatchObject({ input, priority: true, tagPriority: 'low' })
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
  const context = { ogUrlYields: true }
  const compiled = (input: Record<string, any>, defaultCanonical = false): EntryInput => ({ input, priority: false, defaultCanonical })
  const defaults = [
    compiled({ link: [{ rel: 'canonical', href: 'https://example.com/a' }] }, true),
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
    const defaultLink = compiled({ link: [{ rel: 'canonical', href: 'https://example.com/a', tagPriority: 'low' }] }, true)
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
    const defaultLink = compiled({ link: [{ rel: 'canonical', href: 'https://example.com/a', tagPriority: 'low' }] }, true)
    const page = (href: unknown, tagPriority?: unknown) => compiled({ link: [{ rel: 'canonical', href, tagPriority }] })
    expect(planDerivedTags([defaultLink, defaults[1]!, page('https://example.com/b', 'after:title')], context)).toEqual({ _tag: 'Plugin' })
    expect(planDerivedTags([defaultLink, defaults[1]!, page('%site.url/b')], context)).toEqual({ _tag: 'Plugin' })
    const lowOgUrl = compiled({ meta: [{ property: 'og:url', content: 'https://example.com/x', tagPriority: 200 }] })
    expect(planDerivedTags([defaultLink, defaults[1]!, lowOgUrl, page('')], context)).toEqual({ _tag: 'Plugin' })
  })

  it('needs no plugin for a canonical link from another entry with the default href', () => {
    expect(needsDerivedTags([...defaults, compiled({ link: [{ rel: 'canonical', href: 'https://example.com/a' }] })], context)).toBe(false)
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

  // The entries of a real head, after the default entries, as the plugin reads them
  // Vue refs and getters in the input, as `@unhead/vue` resolves them
  const readWith = (push: (head: Unhead<any>) => void) => {
    const head = createHead<any>({ propResolvers: [VueResolver] })
    push(head)
    return [...defaults, ...readEntryInputs(head as any)]
  }

  it('reads normal input with known head keys as it reads compiled tags', () => {
    expect(needsDerivedTags(readWith(head => head.push({ templateParams: { a: 'b' } })), context)).toBe(false)
    expect(needsDerivedTags(readWith(head => head.push({ link: [{ rel: 'alternate', type: 'text/markdown', href: '/index.md' }] })), context)).toBe(false)
    expect(needsDerivedTags(readWith(head => head.push({ link: [{ rel: 'canonical', href: ref('https://other.example.com/') }] })), context)).toBe(true)
    expect(needsDerivedTags([publicImage, ...readWith(head => head.push({ meta: [{ property: 'og:image', content: () => '/post.png' }] }))], context)).toBe(true)
  })

  it('reads the flat meta of a useSeoMeta call through the flat meta plugin of the head', () => {
    expect(needsDerivedTags(readWith(head => useSeoMeta(head, { title: 'Post', ogType: 'article', articleTag: ['a', 'b'] })), context)).toBe(false)
    expect(needsDerivedTags([publicImage, ...readWith(head => useSeoMeta(head, { ogImage: '/a.png' }))], context)).toBe(true)
  })

  it('needs the plugin for normal input it cannot read', () => {
    expect(needsDerivedTags(readWith(head => head.push({ foo: 'bar' } as any)), context)).toBe(true)
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
  const compile = (input: object, dynamicValues = 1) => {
    const result = compileTags(input as any, { dynamicValues })
    if (result._tag !== 'Ok')
      throw new Error('compile failed')
    return result.tags
  }

  it('settles the values of a server entry, so a canonical href compares', () => {
    const head = createCompiledHead()
    head.push(compile({ link: [{ rel: 'canonical', href: dynamicValue(0) }] }) as any, { values: () => ['https://example.com/a'] } as any)
    expect(readEntryInputs(head as any).at(-1)!.input).toEqual({ link: [{ rel: 'canonical', href: 'https://example.com/a' }] })
  })

  it('reads a pending patch of a lazy entry before its input', () => {
    const head = createCompiledHead()
    const active = head.push({ link: [{ rel: 'canonical', href: '/a' }] })
    active.patch({ link: [{ rel: 'canonical', href: '/b' }] })
    expect(readEntryInputs(head as any).at(-1)!.input).toEqual({ link: [{ rel: 'canonical', href: '/b' }] })
  })

  it('marks an entry with a tagPriority option, and the entry it is told is the default canonical', () => {
    const head = createHead()
    head.push({ meta: [] }, { tagPriority: 'low' })
    head.push({ link: [{ rel: 'canonical', href: '/a' }] })
    const canonical = [...head.entries.values()].at(-1)
    expect(readEntryInputs(head as any, canonical).slice(-2)).toMatchObject([{ priority: true, defaultCanonical: false }, { priority: false, defaultCanonical: true }])
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
    const head = createHead<any>({ propResolvers: [VueResolver] })
    head.push({ meta: [{ property: 'og:image', content: ref('/post.png') }] })
    const entry = [...head.entries.values()].at(-1)
    expect(absoluteImageEntries(head as any, resolve)).toEqual([[entry, { meta: [{ property: 'og:image', content: 'https://example.com/post.png' }] }]])
  })

  it('rewrites compiled tags with a relative image URL once their values settle', () => {
    const head = createCompiledHead()
    const tags = compileTags({ meta: [{ property: 'og:image', content: dynamicValue(0) }] }, { dynamicValues: 1 })
    head.push((tags as { tags: unknown }).tags as any, { values: () => ['/post.png'] } as any)
    const entry = [...head.entries.values()].at(-1)
    expect(absoluteImageEntries(head as any, resolve)).toEqual([[entry, { meta: [{ property: 'og:image', content: 'https://example.com/post.png' }] }]])
  })

  it('leaves normal input with no image tag alone', () => {
    const head = createHead()
    head.push({ link: [{ rel: 'alternate', href: '/index.md' }] })
    expect(absoluteImageEntries(head as any, resolve)).toEqual([])
  })

  it('leaves flat meta without an image alone, and flat meta with a relative image to the plugin', () => {
    const flat = (input: object) => {
      const head = createHead()
      useSeoMeta(head, input as any)
      return absoluteImageEntries(head as any, resolve)
    }
    expect(flat({ ogType: 'article', articleTag: ['a'] })).toEqual([])
    expect(flat({ ogImage: 'https://example.com/a.png' })).toEqual([])
    expect(flat({ ogImage: '/a.png' })).toBe('Plugin')
  })

  it('leaves normal input it cannot read to the plugin', () => {
    const head = createHead()
    head.push({ foo: { ogImage: '/a.png' } } as any)
    expect(absoluteImageEntries(head as any, resolve)).toBe('Plugin')
  })
})
