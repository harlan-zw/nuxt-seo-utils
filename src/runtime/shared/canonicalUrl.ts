import type { QueryObject } from 'ufo'
import { parseURL, stringifyParsedURL, stringifyQuery } from 'ufo'

const LOCALE_UNDERSCORE_RE = /_/g
const DEFAULT_LOCALE = 'en'

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
  const parsed = parseURL(url)
  // Locale rules apply to the path only. A Turkish ı in the host names another host,
  // and query values and the hash keep their meaning only as authored.
  if (parsed.host)
    parsed.host = parsed.host.toLowerCase()
  parsed.pathname = lowercasePath(parsed.pathname, locale)
  return stringifyParsedURL(parsed)
}

function lowercasePath(path: string, locale: string | undefined): string {
  try {
    // Without a locale, `toLocaleLowerCase` follows the runtime default, so server and browser disagree.
    return path.toLocaleLowerCase(locale ? locale.replace(LOCALE_UNDERSCORE_RE, '-') : DEFAULT_LOCALE)
  }
  catch {
    // invalid locale tag
    return path.toLowerCase()
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
