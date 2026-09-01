import { describe, expect, it } from 'vitest'
import { formatAppHeadDiagnostic, validateAppHead } from './validateAppHead'

function tags(input: Parameters<typeof validateAppHead>[0]): string[] {
  return validateAppHead(input).map(d => d._tag)
}

describe('locale checks', () => {
  it('flags a non-english lang when no default locale is set', () => {
    const diagnostics = validateAppHead({
      head: { htmlAttrs: { lang: 'fr' } },
    })
    expect(diagnostics).toEqual([
      { _tag: 'LocaleMismatch', level: 'warn', lang: 'fr', defaultLocale: 'en', configured: false },
    ])
    expect(formatAppHeadDiagnostic(diagnostics[0]!)).toContain('defaultLocale: \'fr\'')
  })

  it('flags a lang that disagrees with the configured default locale', () => {
    expect(validateAppHead({
      head: { htmlAttrs: { lang: 'de' } },
      siteConfig: { defaultLocale: 'fr-FR' },
    })).toEqual([
      { _tag: 'LocaleMismatch', level: 'warn', lang: 'de', defaultLocale: 'fr-FR', configured: true },
    ])
  })

  it('accepts a lang that matches the default locale region', () => {
    expect(validateAppHead({
      head: { htmlAttrs: { lang: 'en' } },
      siteConfig: { defaultLocale: 'en-US' },
    })).toEqual([])
  })

  it('flags an underscored html lang', () => {
    expect(validateAppHead({
      head: { htmlAttrs: { lang: 'fr_FR' } },
      siteConfig: { defaultLocale: 'fr-FR' },
    })).toEqual([
      { _tag: 'LangNotBcp47', level: 'warn', lang: 'fr_FR', resolved: 'fr-FR' },
    ])
  })

  it('flags a hyphenated og:locale', () => {
    expect(validateAppHead({
      head: { meta: [{ property: 'og:locale', content: 'fr-FR' }] },
    })).toEqual([
      { _tag: 'OgLocaleNotUnderscored', level: 'warn', content: 'fr-FR', resolved: 'fr_FR' },
    ])
  })

  it('flags a static lang when i18n is installed instead of a mismatch', () => {
    expect(validateAppHead({
      head: { htmlAttrs: { lang: 'fr' } },
      hasI18n: true,
    })).toEqual([
      { _tag: 'StaticLangWithI18n', level: 'warn', lang: 'fr' },
    ])
  })
})

describe('redundant tags', () => {
  it('flags tags that repeat nuxt and module defaults', () => {
    expect(tags({
      head: {
        charset: 'utf-8',
        viewport: 'width=device-width, initial-scale=1',
        meta: [
          { charset: 'utf-8' },
          { name: 'viewport', content: 'width=device-width,  initial-scale=1' },
          { property: 'og:type', content: 'website' },
          { name: 'robots', content: 'index, follow' },
        ],
      },
    })).toEqual(['RedundantTag', 'RedundantTag', 'RedundantTag', 'RedundantTag', 'RedundantTag', 'RedundantTag'])
  })

  it('keeps a viewport that differs from the nuxt default', () => {
    expect(validateAppHead({
      head: { meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }] },
    })).toEqual([])
  })

  it('flags og:site_name that repeats the site name', () => {
    expect(tags({
      head: { meta: [{ property: 'og:site_name', content: 'Acme' }] },
      siteConfig: { name: 'Acme' },
    })).toEqual(['RedundantTag'])
  })

  it('keeps a matching og:site_name when the module defaults are disabled', () => {
    expect(validateAppHead({
      head: { meta: [{ property: 'og:site_name', content: 'Acme' }] },
      siteConfig: { name: 'Acme' },
      defaultsActive: false,
    })).toEqual([])
  })

  it('keeps a sole og:site_name when the module defaults are disabled', () => {
    const diagnostics = validateAppHead({
      head: { meta: [{ property: 'og:site_name', content: 'Acme' }] },
      siteConfig: {},
      defaultsActive: false,
    })
    expect(diagnostics).toEqual([])
    for (const diagnostic of diagnostics) {
      const message = formatAppHeadDiagnostic(diagnostic)
      expect(message).not.toContain('remove the meta tag')
      expect(message).not.toContain('nuxt-seo-utils then sets it')
    }
  })

  it('keeps a disagreeing og:site_name when the module defaults are disabled', () => {
    expect(validateAppHead({
      head: { meta: [{ property: 'og:site_name', content: 'Acme' }] },
      siteConfig: { name: 'Acme Inc' },
      defaultsActive: false,
    })).toEqual([])
  })

  it('keeps a description that repeats the site config when site config merging is disabled', () => {
    expect(validateAppHead({
      head: { meta: [{ name: 'description', content: 'Acme builds things.' }] },
      siteConfig: { description: 'Acme builds things.' },
      mergeWithSiteConfig: false,
    })).toEqual([])
  })

  it('flags og:site_name that disagrees with the site name', () => {
    expect(validateAppHead({
      head: { meta: [{ property: 'og:site_name', content: 'Acme' }] },
      siteConfig: { name: 'Acme Inc' },
    })).toEqual([
      { _tag: 'SiteNameMismatch', level: 'warn', head: 'Acme', site: 'Acme Inc' },
    ])
  })

  it('guides to set site.name instead of dropping og:site_name when no site name is set', () => {
    const diagnostics = validateAppHead({
      head: { meta: [{ property: 'og:site_name', content: 'Acme' }] },
      siteConfig: {},
    })
    expect(diagnostics.some(d => d._tag === 'RedundantTag')).toBe(false)
    expect(diagnostics[0]).toMatchObject({ _tag: 'SiteNameMismatch', level: 'warn', head: 'Acme' })
    expect(formatAppHeadDiagnostic(diagnostics[0]!)).toContain('site.name')
  })
})

describe('dead and conflicting tags', () => {
  it('flags a global canonical as an error', () => {
    const diagnostics = validateAppHead({
      head: { link: [{ rel: 'canonical', href: 'https://example.com' }] },
    })
    expect(diagnostics[0]).toMatchObject({ _tag: 'GlobalPageTag', level: 'error', tag: 'link[rel="canonical"]' })
  })

  it('skips module-owned diagnostics when the module defaults are disabled', () => {
    const head = {
      meta: [
        { property: 'og:url', content: 'https://example.com' },
        { property: 'og:type', content: 'website' },
      ],
      link: [{ rel: 'canonical', href: 'https://example.com' }],
    }
    expect(validateAppHead({ head, defaultsActive: false })).toEqual([])
    expect(tags({ head })).toEqual(['GlobalPageTag', 'RedundantTag', 'GlobalPageTag'])
  })

  it('flags a global og:url and hreflang', () => {
    expect(tags({
      head: {
        meta: [{ property: 'og:url', content: 'https://example.com' }],
        link: [{ rel: 'alternate', hreflang: 'fr', href: 'https://example.com/fr' }],
      },
    })).toEqual(['GlobalPageTag', 'GlobalPageTag'])
  })

  it('flags a robots tag when the robots module owns it', () => {
    expect(validateAppHead({
      head: { meta: [{ name: 'robots', content: 'noindex' }] },
      hasRobotsModule: true,
    })).toEqual([
      { _tag: 'RobotsModuleConflict', level: 'warn', content: 'noindex' },
    ])
  })

  it('flags duplicate tags with different content', () => {
    expect(tags({
      head: {
        meta: [
          { name: 'description', content: 'One' },
          { name: 'description', content: 'Two' },
        ],
      },
    })).toEqual(['DuplicateTag'])
  })

  it('ignores duplicate tags with identical content', () => {
    expect(validateAppHead({
      head: {
        meta: [
          { name: 'description', content: 'One' },
          { name: 'description', content: 'One' },
        ],
      },
    })).toEqual([])
  })

  it('accepts duplicate arrayable meta keys that unhead renders as a list', () => {
    expect(validateAppHead({
      head: {
        meta: [
          { property: 'og:image', content: 'https://example.com/a.png' },
          { property: 'og:image', content: 'https://example.com/b.png' },
        ],
      },
    })).toEqual([])
  })

  it('accepts a second theme-color, another arrayable key', () => {
    expect(validateAppHead({
      head: {
        meta: [
          { name: 'theme-color', content: '#000000', media: '(prefers-color-scheme: dark)' },
          { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },
        ],
      },
    })).toEqual([])
  })

  it('still flags duplicates of keys unhead dedupes', () => {
    expect(tags({
      head: {
        meta: [
          { property: 'og:title', content: 'One' },
          { property: 'og:title', content: 'Two' },
        ],
      },
    })).toEqual(['DuplicateTag'])
  })

  it('flags a meta entry with no identifying key', () => {
    expect(validateAppHead({
      head: { meta: [{ content: 'orphaned' }] },
    })).toEqual([
      { _tag: 'MalformedTag', level: 'warn', index: 0 },
    ])
  })

  it('flags a title template with no page title placeholder', () => {
    expect(tags({
      head: { titleTemplate: 'My Site' },
    })).toEqual(['TitleTemplateMissingPlaceholder'])
  })

  it('accepts a title template with a placeholder', () => {
    expect(validateAppHead({ head: { titleTemplate: '%s | My Site' } })).toEqual([])
  })

  it('flags a relative social image when no site url is set', () => {
    expect(validateAppHead({
      head: { meta: [{ property: 'og:image', content: '/og.png' }] },
    })).toEqual([
      { _tag: 'RelativeSocialImage', level: 'warn', tag: 'og:image', src: '/og.png' },
    ])
  })

  it('accepts a relative social image once a site url is set', () => {
    expect(validateAppHead({
      head: { meta: [{ property: 'og:image', content: '/og.png' }] },
      siteConfig: { url: 'https://example.com' },
    })).toEqual([])
  })
})

describe('clean configs', () => {
  it('reports nothing for a head with no issues', () => {
    expect(validateAppHead({
      head: {
        titleTemplate: '%s %separator %siteName',
        htmlAttrs: { lang: 'fr-FR' },
        meta: [{ name: 'theme-color', content: '#000000' }],
        link: [{ rel: 'icon', href: '/favicon.ico' }],
      },
      siteConfig: { name: 'Acme', url: 'https://example.com', defaultLocale: 'fr-FR' },
    })).toEqual([])
  })
})
