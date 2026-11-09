import type { CompiledHeadShapes } from '../../src/build-time/compiledHead'
import { compileTags, dynamicValue, readEntry } from 'unhead/compiled'
import { createHead as createCompiledHead, renderSSRHead as renderCompiledHead } from 'unhead/compiled/server'
import { createHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'
import { compileHeadShapes } from '../../src/build-time/compiledHead'
import { chooseShape, pushChosenHead, pushServerChosenHead } from '../../src/runtime/app/logic/compiledHead'
import { chooseClientSiteHead, chooseServerSiteHead } from '../../src/runtime/app/logic/siteHead'
import { compiledHeadShapes } from '../../src/runtime/shared/compiledHeadShapes'

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
    // the render settles the choice, and a new entry with the option replaces the first
    renderCompiledHead(head)
    const entry = [...head.entries.values()].at(-1)!
    expect(entry.options).toMatchObject({ tagPriority: 'low' })
    expect(readEntry(entry, head).input).toEqual(input)
  })

  it('keeps normal input on the client when its input differs from the server input', () => {
    const payload = {}
    chooseServerSiteHead(payload, 'defaults', input)
    const changed = { templateParams: { site: { name: 'Mon Site' }, siteName: 'Mon Site' } }
    expect(chooseClientSiteHead(payload, 'defaults', changed)).toEqual({ _tag: 'Loose', input: changed })
    expect(chooseClientSiteHead({}, 'defaults', input)).toEqual({ _tag: 'Loose', input })
  })
})
