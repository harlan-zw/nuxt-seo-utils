import type { HeadPlugin, HeadTag, Unhead } from 'unhead/types'
import { readEntry } from 'unhead/compiled'
import { withTagTransform } from 'unhead/plugins'
import { TWITTER_IMAGE_FALLBACK_KEY } from '../../shared/derivedTagKeys'
import { ABSOLUTE_IMAGE_URLS_PLUGIN_KEY, needsAbsoluteImageUrl } from './absoluteImageUrls'
import { DERIVED_TAGS_PLUGIN_KEY } from './derivedTagsPlugin'
import { syncDerivedTags } from './syncDerivedTags'

// The start of a dynamic value token: the server memo runs a transform with one in place of each dynamic value
const DYNAMIC_VALUE_OPEN = String.fromCharCode(0xE000)

function list(value: unknown): Record<string, any>[] {
  return (Array.isArray(value) ? value : value ? [value] : []).filter(item => item && typeof item === 'object')
}

const entryOf = (tag: HeadTag): number | undefined => tag._p === undefined ? undefined : tag._p >> 10

function isOgImageDependent(tag: HeadTag): boolean {
  const key = tag.props.property ?? tag.props.name
  return tag.tag === 'meta' && (String(key).startsWith('og:image:') || !!tag.key?.startsWith(TWITTER_IMAGE_FALLBACK_KEY))
}

/**
 * The entries with an `og:image`, among those whose `og:image:*` tags rendered without one. Only
 * the entries of those tags are read. Which entries hold an `og:image` follows from the compiled
 * tags the memo keys on, so the output stays pure for the memo.
 */
function ogImageEntries(head: Unhead<any, any>, tags: HeadTag[]): Set<number> {
  const rendered = new Set<number | undefined>()
  for (const tag of tags) {
    if (tag.tag === 'meta' && (tag.props.property ?? tag.props.name) === 'og:image')
      rendered.add(entryOf(tag))
  }
  const ids = new Set<number>()
  for (const tag of tags) {
    const id = entryOf(tag)
    if (id === undefined || rendered.has(id) || ids.has(id) || !isOgImageDependent(tag))
      continue
    const entry = head.entries.get(id)
    if (entry && list(readEntry(entry, head).input.meta).some(meta => (meta.property ?? meta.name) === 'og:image'))
      ids.add(id)
  }
  return ids
}

/**
 * The derived tags plugin as a tag transform, for compiler mode: the same output as its
 * `tags:beforeResolve` hook, without taking the head off the server memo or loading the full
 * runtime on the client. It copies the canonical href, which may be a token, and never tests it.
 */
export function createDerivedTagsTransform(head: Unhead<any, any>): HeadPlugin {
  return withTagTransform(head, {
    key: DERIVED_TAGS_PLUGIN_KEY,
    transform: tags => syncDerivedTags(tags, ogImageEntries(head, tags)),
  })
}

/**
 * The absolute image URLs plugin as a tag transform, for compiler mode. A token is left as it
 * is: `cacheKey` keeps the memo only while every image value of the head is absolute, so a
 * token stands for an absolute URL. A relative value, static or dynamic, keeps the memo out,
 * because `readEntry` cannot tell which values the memo holds as tokens.
 */
export function createAbsoluteImageUrlsTransform(head: Unhead<any, any>, resolve: (path: string) => string, siteUrl: string): HeadPlugin {
  return withTagTransform(head, {
    key: ABSOLUTE_IMAGE_URLS_PLUGIN_KEY,
    transform: tags => tags.map(tag => needsAbsoluteImageUrl(tag.tag, { ...tag.props }) && !tag.props.content!.includes(DYNAMIC_VALUE_OPEN)
      ? { ...tag, props: { ...tag.props, content: resolve(tag.props.content!) } }
      : tag),
    cacheKey: () => {
      for (const entry of head.entries.values()) {
        if (list(readEntry(entry, head).input.meta).some(meta => needsAbsoluteImageUrl('meta', meta)))
          return null
      }
      return siteUrl
    },
  })
}
