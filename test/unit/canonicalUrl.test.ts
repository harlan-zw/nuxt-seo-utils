import { afterEach, describe, expect, it, vi } from 'vitest'
import { normaliseCanonicalUrl, resolveCanonicalUrl } from '../../src/runtime/shared/canonicalUrl'

const nativeToLocaleLowerCase = String.prototype.toLocaleLowerCase

describe('normaliseCanonicalUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lowercases the host without locale rules', () => {
    // Turkish maps I to dotless ı. A host with ı is a different host.
    expect(normaliseCanonicalUrl('https://EXAMPLE.IO/Iletisim', { lowercase: true, locale: 'tr-TR' }))
      .toBe(`https://example.io/${'Iletisim'.toLocaleLowerCase('tr-TR')}`)
  })

  it('keeps the query and the hash as authored', () => {
    expect(normaliseCanonicalUrl('https://example.com/Search?Q=Foo#Top', { lowercase: true, locale: 'en' }))
      .toBe('https://example.com/search?Q=Foo#Top')
  })

  it('lowercases a relative path', () => {
    expect(normaliseCanonicalUrl('/Blog/My-Post?Page=2', { lowercase: true, locale: 'en' }))
      .toBe('/blog/my-post?Page=2')
  })

  it('ignores the runtime default locale when no locale is set', () => {
    // Simulate a runtime whose default locale is Turkish, such as a Turkish browser.
    vi.spyOn(String.prototype, 'toLocaleLowerCase').mockImplementation(function (this: string, locales?: Intl.LocalesArgument) {
      return nativeToLocaleLowerCase.call(this, locales ?? 'tr-TR')
    })
    expect(normaliseCanonicalUrl('https://example.com/Iletisim', { lowercase: true }))
      .toBe('https://example.com/iletisim')
  })

  it('keeps the URL when lowercase is off', () => {
    expect(normaliseCanonicalUrl('https://EXAMPLE.com/Blog?Q=A', { lowercase: false }))
      .toBe('https://EXAMPLE.com/Blog?Q=A')
  })
})

describe('resolveCanonicalUrl', () => {
  it('keeps whitelisted query values as authored', () => {
    expect(resolveCanonicalUrl('https://example.com/Blog', { Page: 'A', utm: 'x' }, { lowercase: true, locale: 'en', queryWhitelist: ['Page'] }))
      .toBe('https://example.com/blog?Page=A')
  })
})
