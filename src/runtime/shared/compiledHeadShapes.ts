import { OG_URL_KEY } from './derivedTagKeys'

type TagPriority = number | string | undefined

/**
 * The head input of each default entry under compiler mode, with its values as arguments.
 * The build calls each builder with `dynamicValue()` tokens and compiles the result. At runtime
 * the same builder makes the normal input for a value that compiled tags cannot render.
 *
 * Each entry carries its priority inside its tags, so the entry takes no options.
 */
export const compiledHeadShapes = {
  lang: (lang: unknown) => ({ htmlAttrs: { lang, tagPriority: 'low' } }),
  titleTemplate: () => ({ titleTemplate: { textContent: '%s %separator %siteName', tagPriority: 'low' } }),
  errorTitleTemplate: () => ({ titleTemplate: { textContent: '%s', tagPriority: 'low' } }),
  // `false` drops the canonical link, as `link: [false]` does
  canonical: (href: unknown) => href === false ? {} : { link: [{ rel: 'canonical', href, tagPriority: 'low' }] },
  ogLocale: (locale: unknown) => ({ meta: [{ property: 'og:locale', content: locale, tagPriority: 'low' }] }),
  description: (description: unknown) => ({ meta: [{ name: 'description', content: description, tagPriority: 'low' }] }),
  siteMeta: (siteName: unknown, tagPriority: TagPriority) => ({
    meta: [
      { property: 'og:type', content: 'website', tagPriority },
      { property: 'og:site_name', content: siteName, tagPriority },
    ],
  }),
  siteMetaTwitter: (siteName: unknown, twitter: unknown, tagPriority: TagPriority) => ({
    meta: [
      { property: 'og:type', content: 'website', tagPriority },
      { property: 'og:site_name', content: siteName, tagPriority },
      { name: 'twitter:creator', content: twitter, tagPriority },
      { name: 'twitter:site', content: twitter, tagPriority },
    ],
  }),
  ogUrl: (href: unknown, tagPriority: TagPriority) => ({ meta: [{ property: 'og:url', content: href, key: OG_URL_KEY, tagPriority }] }),
  fallbackTitle: (title: unknown) => ({ title: { textContent: title, tagPriority: 101 } }),
} as const

export type CompiledHeadShapeName = keyof typeof compiledHeadShapes

/** The number of values of each shape. The build passes `tagPriority` as a static value, never a token. */
export const compiledHeadShapeValues: Record<CompiledHeadShapeName, number> = {
  lang: 1,
  titleTemplate: 0,
  errorTitleTemplate: 0,
  canonical: 1,
  ogLocale: 1,
  description: 1,
  siteMeta: 1,
  siteMetaTwitter: 2,
  ogUrl: 1,
  fallbackTitle: 1,
}

/** Values with no text that a shape may hold. Each has its own compiled tags, with no values. */
export const SPECIAL_VALUES = ['null', 'undefined', 'false'] as const
export type SpecialValue = typeof SPECIAL_VALUES[number]

/**
 * One shape, compiled at build time. `tags` hold the dynamic values. `special` holds the tags
 * for a shape with one value that is `null`, `undefined`, or `false`.
 */
export interface CompiledHeadShape<Tags = unknown> {
  tags: Tags
  special: Partial<Record<SpecialValue, Tags>>
}

/**
 * The values that compiled tags render the same way as normal input, on the server and on the
 * client: a non-empty string other than `'true'`, or a finite number other than `0`.
 */
export function isText(value: unknown): boolean {
  return typeof value === 'string' ? !!value && value !== 'true' : typeof value === 'number' && Number.isFinite(value) && value !== 0
}

export function specialValue(value: unknown): SpecialValue | undefined {
  return value === null ? 'null' : value === undefined ? 'undefined' : value === false ? 'false' : undefined
}

/** The shapes of `#nuxt-seo-utils/compiled-head`, compiled at build time. */
export type CompiledHeadShapes = Partial<Record<CompiledHeadShapeName, CompiledHeadShape>>
