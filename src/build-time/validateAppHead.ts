import type { Nuxt } from '@nuxt/schema'

/**
 * A head entry as authored in `nuxt.config`. Values stay `unknown` because the user
 * input is untrusted at this point; each check narrows what it needs.
 */
export interface HeadEntry { [key: string]: unknown }

export interface UserAppHead {
  charset?: unknown
  viewport?: unknown
  title?: unknown
  titleTemplate?: unknown
  htmlAttrs?: Record<string, unknown>
  meta?: HeadEntry[]
  link?: HeadEntry[]
}

export interface AppHeadContext {
  head: UserAppHead
  siteConfig?: {
    name?: string
    url?: string
    description?: string
    defaultLocale?: string
  }
  hasI18n?: boolean
  hasRobotsModule?: boolean
  /**
   * Whether the module's automatic defaults own the per route tags.
   * When `false`, diagnostics that claim nuxt-seo-utils sets canonical, `og:url`,
   * or `og:type` are skipped, they would be wrong advice.
   */
  defaultsActive?: boolean
}

export type DiagnosticLevel = 'error' | 'warn' | 'info'

export type AppHeadDiagnostic
  = | { _tag: 'LocaleMismatch', level: 'warn', lang: string, defaultLocale: string, configured: boolean }
    | { _tag: 'LangNotBcp47', level: 'warn', lang: string, resolved: string }
    | { _tag: 'OgLocaleNotUnderscored', level: 'warn', content: string, resolved: string }
    | { _tag: 'StaticLangWithI18n', level: 'warn', lang: string }
    | { _tag: 'RedundantTag', level: 'info', tag: string, reason: string }
    | { _tag: 'GlobalPageTag', level: 'error' | 'warn', tag: string, reason: string }
    | { _tag: 'DuplicateTag', level: 'warn', tag: string }
    | { _tag: 'MalformedTag', level: 'warn', index: number }
    | { _tag: 'TitleTemplateMissingPlaceholder', level: 'warn', titleTemplate: string }
    | { _tag: 'SiteNameMismatch', level: 'warn', head: string, site?: string }
    | { _tag: 'RelativeSocialImage', level: 'warn', tag: string, src: string }
    | { _tag: 'RobotsModuleConflict', level: 'warn', content: string }

const NUXT_DEFAULT_VIEWPORT = 'width=device-width, initial-scale=1'
const UNDERSCORE_RE = /_/g
const HYPHEN_RE = /-/g
const WS_RE = /\s+/g
const ABSOLUTE_SRC_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i

/** `robots` values that repeat the crawler default. */
const NOOP_ROBOTS = new Set(['index', 'follow', 'all', 'index,follow', 'follow,index'])

/**
 * Meta keys unhead keeps every entry for, copied from unhead's `MetaTagsArrayable`.
 */
const META_TAGS_ARRAYABLE = new Set([
  'theme-color',
  'google-site-verification',
  'author',
  'og:locale:alternate',
  'og:image',
  'og:video',
  'og:audio',
  'article:author',
  'article:tag',
  'book:author',
  'book:tag',
  'twitter:image',
])

/**
 * Whether unhead renders every entry for this key, so a repeat is a list and not a clash.
 * Mirrors unhead's `isMetaArrayDupeKey`, which matches the suffix after the `meta:` prefix.
 */
function isMetaArrayable(key: string): boolean {
  const dedupeKey = `meta:${key}`
  const suffix = dedupeKey.slice(dedupeKey.indexOf(':') + 1)
  return META_TAGS_ARRAYABLE.has(suffix)
    || suffix.startsWith('og:image:')
    || suffix.startsWith('og:video:')
    || suffix.startsWith('og:audio:')
    || suffix.startsWith('twitter:image:')
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(WS_RE, ' ')
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/** The identity of a meta tag, as unhead dedupes it. */
export function metaTagKey(entry: HeadEntry): string | undefined {
  if (asString(entry.charset))
    return 'charset'
  const key = asString(entry.name) || asString(entry.property) || asString(entry['http-equiv'])
  return key?.toLowerCase()
}

function findMeta(meta: HeadEntry[], key: string): HeadEntry | undefined {
  return meta.find(entry => metaTagKey(entry) === key)
}

function metaContent(entry: HeadEntry | undefined): string | undefined {
  return entry ? asString(entry.content) : undefined
}

/** The base language of a locale, so `en-US` and `en` compare equal. */
function baseLanguage(locale: string): string {
  return locale.toLowerCase().replace(UNDERSCORE_RE, '-').split('-')[0]!
}

function checkLocale(ctx: AppHeadContext, diagnostics: AppHeadDiagnostic[]): void {
  const lang = asString(ctx.head.htmlAttrs?.lang)
  const meta = ctx.head.meta || []
  const ogLocale = metaContent(findMeta(meta, 'og:locale'))
  if (ogLocale && ogLocale.includes('-')) {
    diagnostics.push({
      _tag: 'OgLocaleNotUnderscored',
      level: 'warn',
      content: ogLocale,
      resolved: ogLocale.replace(HYPHEN_RE, '_'),
    })
  }
  if (!lang)
    return
  if (lang.includes('_')) {
    diagnostics.push({
      _tag: 'LangNotBcp47',
      level: 'warn',
      lang,
      resolved: lang.replace(UNDERSCORE_RE, '-'),
    })
  }
  if (ctx.hasI18n) {
    // i18n owns the lang attribute per route, so a static value pins every locale to one language.
    diagnostics.push({ _tag: 'StaticLangWithI18n', level: 'warn', lang })
    return
  }
  const configured = asString(ctx.siteConfig?.defaultLocale)
  // `applyDefaults` falls back to `en` when no default locale is set.
  const defaultLocale = configured || 'en'
  if (baseLanguage(lang) !== baseLanguage(defaultLocale)) {
    diagnostics.push({
      _tag: 'LocaleMismatch',
      level: 'warn',
      lang,
      defaultLocale,
      configured: Boolean(configured),
    })
  }
}

function checkMeta(ctx: AppHeadContext, diagnostics: AppHeadDiagnostic[]): void {
  const meta = ctx.head.meta || []
  const seen = new Map<string, string | undefined>()
  meta.forEach((entry, index) => {
    const key = metaTagKey(entry)
    if (!key) {
      diagnostics.push({ _tag: 'MalformedTag', level: 'warn', index })
      return
    }
    const content = key === 'charset' ? asString(entry.charset) : metaContent(entry)
    if (seen.has(key) && seen.get(key) !== content && !isMetaArrayable(key))
      diagnostics.push({ _tag: 'DuplicateTag', level: 'warn', tag: key })
    seen.set(key, content)

    if (key === 'charset' && content?.toLowerCase() === 'utf-8')
      diagnostics.push({ _tag: 'RedundantTag', level: 'info', tag: 'charset', reason: 'Nuxt sets it by default.' })

    if (key === 'viewport' && content && normalizeWhitespace(content) === NUXT_DEFAULT_VIEWPORT)
      diagnostics.push({ _tag: 'RedundantTag', level: 'info', tag: 'viewport', reason: 'Nuxt sets the same value by default.' })

    if (key === 'og:type' && content === 'website' && ctx.defaultsActive !== false)
      diagnostics.push({ _tag: 'RedundantTag', level: 'info', tag: 'og:type', reason: 'nuxt-seo-utils sets it by default.' })

    if (key === 'og:url' && ctx.defaultsActive !== false)
      diagnostics.push({ _tag: 'GlobalPageTag', level: 'warn', tag: 'og:url', reason: 'It applies the same URL to every page. nuxt-seo-utils sets it per route.' })

    if (key === 'robots' && content) {
      if (ctx.hasRobotsModule)
        diagnostics.push({ _tag: 'RobotsModuleConflict', level: 'warn', content })
      else if (NOOP_ROBOTS.has(content.toLowerCase().replace(WS_RE, '')))
        diagnostics.push({ _tag: 'RedundantTag', level: 'info', tag: 'robots', reason: 'Crawlers index and follow by default.' })
    }

    if (key === 'og:site_name' && content) {
      const siteName = asString(ctx.siteConfig?.name)
      if (!siteName) {
        // no site `name` means the module sets nothing, so the tag is doing real work
        diagnostics.push({ _tag: 'SiteNameMismatch', level: 'warn', head: content })
      }
      else if (siteName === content) {
        diagnostics.push({ _tag: 'RedundantTag', level: 'info', tag: 'og:site_name', reason: 'nuxt-seo-utils sets it from your site config.' })
      }
      else {
        diagnostics.push({ _tag: 'SiteNameMismatch', level: 'warn', head: content, site: siteName })
      }
    }

    if (key === 'description' && content && content === asString(ctx.siteConfig?.description))
      diagnostics.push({ _tag: 'RedundantTag', level: 'info', tag: 'description', reason: 'nuxt-seo-utils sets it from your site config.' })

    if ((key === 'og:image' || key === 'twitter:image') && content && !ABSOLUTE_SRC_RE.test(content) && !asString(ctx.siteConfig?.url))
      diagnostics.push({ _tag: 'RelativeSocialImage', level: 'warn', tag: key, src: content })
  })
}

function checkShorthand(ctx: AppHeadContext, diagnostics: AppHeadDiagnostic[]): void {
  const charset = asString(ctx.head.charset)
  if (charset?.toLowerCase() === 'utf-8')
    diagnostics.push({ _tag: 'RedundantTag', level: 'info', tag: 'app.head.charset', reason: 'Nuxt sets `utf-8` by default.' })

  const viewport = asString(ctx.head.viewport)
  if (viewport && normalizeWhitespace(viewport) === NUXT_DEFAULT_VIEWPORT)
    diagnostics.push({ _tag: 'RedundantTag', level: 'info', tag: 'app.head.viewport', reason: 'Nuxt sets the same value by default.' })

  const titleTemplate = ctx.head.titleTemplate
  if (typeof titleTemplate === 'string' && !titleTemplate.includes('%s')) {
    diagnostics.push({ _tag: 'TitleTemplateMissingPlaceholder', level: 'warn', titleTemplate })
  }
}

function checkLinks(ctx: AppHeadContext, diagnostics: AppHeadDiagnostic[]): void {
  for (const link of ctx.head.link || []) {
    const rel = asString(link.rel)?.toLowerCase()
    if (rel === 'canonical') {
      if (ctx.defaultsActive !== false) {
        diagnostics.push({
          _tag: 'GlobalPageTag',
          level: 'error',
          tag: 'link[rel="canonical"]',
          reason: 'It points every page at one URL. nuxt-seo-utils sets a canonical per route.',
        })
      }
    }
    else if (rel === 'alternate' && asString(link.hreflang)) {
      diagnostics.push({
        _tag: 'GlobalPageTag',
        level: 'warn',
        tag: 'link[rel="alternate"][hreflang]',
        reason: 'It repeats the same alternate URL on every page. Let @nuxtjs/i18n generate it.',
      })
    }
  }
}

/**
 * Check a user authored `app.head` for conflicts, redundancy, and dead tags.
 *
 * Pure: pass the head as written in `nuxt.config`, never the head Nuxt has already
 * normalized, or the injected `charset` and `viewport` defaults read as user input.
 */
export function validateAppHead(ctx: AppHeadContext): AppHeadDiagnostic[] {
  const diagnostics: AppHeadDiagnostic[] = []
  checkLocale(ctx, diagnostics)
  checkShorthand(ctx, diagnostics)
  checkMeta(ctx, diagnostics)
  checkLinks(ctx, diagnostics)
  return diagnostics
}

export function formatAppHeadDiagnostic(diagnostic: AppHeadDiagnostic): string {
  switch (diagnostic._tag) {
    case 'LocaleMismatch':
      return diagnostic.configured
        ? `\`app.head.htmlAttrs.lang\` is "${diagnostic.lang}" but site \`defaultLocale\` is "${diagnostic.defaultLocale}". og:locale, canonical casing, and Schema.org will use "${diagnostic.defaultLocale}". Set \`site.defaultLocale\` to "${diagnostic.lang}".`
        : `\`app.head.htmlAttrs.lang\` is "${diagnostic.lang}" but no site \`defaultLocale\` is set, so it falls back to "en". og:locale, canonical casing, and Schema.org will use "en". Add \`site: { defaultLocale: '${diagnostic.lang}' }\` to your Nuxt config.`
    case 'LangNotBcp47':
      return `\`app.head.htmlAttrs.lang\` is "${diagnostic.lang}". The HTML lang attribute needs a hyphen. Use "${diagnostic.resolved}".`
    case 'OgLocaleNotUnderscored':
      return `\`og:locale\` is "${diagnostic.content}". Open Graph needs an underscore. Use "${diagnostic.resolved}".`
    case 'StaticLangWithI18n':
      return `\`app.head.htmlAttrs.lang\` is "${diagnostic.lang}" while an i18n module is installed. It pins every locale to one language. Remove it and set the locale in your i18n config.`
    case 'RedundantTag':
      return `\`${diagnostic.tag}\` repeats a default. ${diagnostic.reason} You can remove it.`
    case 'GlobalPageTag':
      return `\`${diagnostic.tag}\` is set in \`app.head\`. ${diagnostic.reason}`
    case 'DuplicateTag':
      return `\`${diagnostic.tag}\` is set more than once with different content. Only the last value renders.`
    case 'MalformedTag':
      return `\`app.head.meta[${diagnostic.index}]\` has no \`name\`, \`property\`, \`http-equiv\`, or \`charset\`. It renders an empty tag.`
    case 'TitleTemplateMissingPlaceholder':
      return `\`titleTemplate\` is "${diagnostic.titleTemplate}" and has no \`%s\`. Every page renders the same title. Add \`%s\` where the page title belongs.`
    case 'SiteNameMismatch':
      return diagnostic.site
        ? `\`og:site_name\` is "${diagnostic.head}" but site \`name\` is "${diagnostic.site}". Keep one source of truth. Set \`site.name\` and remove the meta tag.`
        : `\`og:site_name\` is "${diagnostic.head}" but no site \`name\` is set. Set \`site.name\` to "${diagnostic.head}" and remove the meta tag, nuxt-seo-utils then sets it from your site config.`
    case 'RelativeSocialImage':
      return `\`${diagnostic.tag}\` is "${diagnostic.src}" and no site \`url\` is set. Crawlers need an absolute URL. Set \`site.url\`.`
    case 'RobotsModuleConflict':
      return `\`robots\` is "${diagnostic.content}" in \`app.head\` while @nuxtjs/robots is installed. The two fight over the tag. Configure it through the robots module instead.`
  }
}

/**
 * Merge the `app.head` each layer authored. Nuxt injects `charset` and `viewport`
 * defaults into the resolved head, so reading the raw layer config keeps those
 * defaults from looking like user input.
 */
export function collectUserAppHead(nuxt: Nuxt): UserAppHead {
  const head: UserAppHead = { meta: [], link: [] }
  for (const layer of nuxt.options._layers || []) {
    const layerHead = (layer.config?.app as { head?: UserAppHead } | undefined)?.head
    if (!layerHead)
      continue
    head.meta!.push(...(layerHead.meta || []))
    head.link!.push(...(layerHead.link || []))
    head.charset ??= layerHead.charset
    head.viewport ??= layerHead.viewport
    head.titleTemplate ??= layerHead.titleTemplate
    head.title ??= layerHead.title
    if (layerHead.htmlAttrs)
      head.htmlAttrs = { ...layerHead.htmlAttrs, ...head.htmlAttrs }
  }
  return head
}
