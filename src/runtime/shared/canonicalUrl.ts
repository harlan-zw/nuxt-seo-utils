import type { QueryObject } from 'ufo'
import { stringifyQuery } from 'ufo'

const LOCALE_UNDERSCORE_RE = /_/g

export interface CanonicalUrlOptions {
  lowercase: boolean
  /** BCP 47 or underscore locale. Lowercasing follows its rules, for example Turkish dotless ı. */
  locale?: string
}

/**
 * The one normaliser for absolute URLs that name the page: the canonical link, og:url,
 * share links, and Schema.org breadcrumb items. Navigation links never pass through it.
 */
export function normaliseCanonicalUrl(url: string, { lowercase, locale }: CanonicalUrlOptions): string {
  if (!lowercase)
    return url
  try {
    return url.toLocaleLowerCase(locale?.replace(LOCALE_UNDERSCORE_RE, '-'))
  }
  catch {
    // invalid locale tag
    return url.toLowerCase()
  }
}

/**
 * Normalises the page URL and keeps only whitelisted query keys, sorted.
 */
export function resolveCanonicalUrl(url: string, query: QueryObject, options: CanonicalUrlOptions & { queryWhitelist: string[] }): string {
  const normalised = normaliseCanonicalUrl(url, options)
  const filteredQuery = Object.fromEntries(
    Object.entries(query)
      .filter(([key]) => options.queryWhitelist.includes(key))
      .sort(([a], [b]) => a.localeCompare(b)),
  ) as QueryObject
  return Object.keys(filteredQuery).length
    ? `${normalised}?${stringifyQuery(filteredQuery)}`
    : normalised
}
