import type { HeadTag } from '@unhead/vue/types'
import { OG_URL_KEY, TWITTER_CARD_KEY, TWITTER_IMAGE_FALLBACK_KEY } from '../../shared/derivedTagKeys'

// Reads Unhead internals: `_p` (entry index in the high bits of a tag position) here, and
// each entry's `_tags` in the derivedTags plugin. Unhead has no public way to learn which
// tags lost deduplication. Move this to a public hook once Unhead has one, for example
// `tags:dedupe` called from dedupeTags with `{ kept, dropped }` whenever a tag replaces
// another, where each tag carries a public entry id.
function entryOf(tag: HeadTag): number | undefined {
  return tag._p === undefined ? undefined : tag._p >> 10
}

function metaKey(tag: HeadTag): string | undefined {
  const key = tag.props.property ?? tag.props.name
  return typeof key === 'string' ? key : undefined
}

function isOgImage(tag: HeadTag): boolean {
  return tag.tag === 'meta' && metaKey(tag) === 'og:image'
}

const IMAGE_META_KEYS = new Set(['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image', 'twitter:image:src'])

function isImage(tag: HeadTag): boolean {
  const content = tag.props.content
  return tag.tag === 'meta' && IMAGE_META_KEYS.has(metaKey(tag) ?? '') && typeof content === 'string' && content.trim() !== ''
}

/**
 * Returns the entries whose tags hold an `og:image`, before deduplication.
 */
export function ogImageEntryIds(entryTags: Iterable<HeadTag[]>): Set<number> {
  const ids = new Set<number>()
  for (const tags of entryTags) {
    const tag = tags.find(isOgImage)
    const id = tag && entryOf(tag)
    if (id !== undefined)
      ids.add(id)
  }
  return ids
}

/**
 * Keeps tags that describe another tag consistent with the tag that won deduplication.
 *
 * - `og:image:*` tags from an entry whose `og:image` lost are dropped, so a page `ogImage`
 *   does not keep the width, height, or type of the `public/` image.
 * - `twitter:image` tags copied from a `public/` og-image follow the same rule.
 * - The default `og:url` takes the href of the resolved canonical link.
 * - The default `twitter:card` is `summary_large_image` when an image tag remains, else `summary`.
 */
export function syncDerivedTags(tags: HeadTag[], entriesWithOgImage: Set<number>): HeadTag[] {
  const winningOgImageEntries = new Set<number | undefined>()
  let canonicalTag: HeadTag | undefined
  for (const tag of tags) {
    if (isOgImage(tag))
      winningOgImageEntries.add(entryOf(tag))
    if (!canonicalTag && tag.tag === 'link' && tag.props.rel === 'canonical')
      canonicalTag = tag
  }
  const canonicalHref = canonicalTag?.props.href
  const lostOgImage = (tag: HeadTag): boolean => {
    const entry = entryOf(tag)
    return entry !== undefined && entriesWithOgImage.has(entry) && !winningOgImageEntries.has(entry)
  }
  const result: HeadTag[] = []
  let twitterCardIndex: number | undefined
  for (const tag of tags) {
    if (tag.tag === 'meta') {
      if (metaKey(tag)?.startsWith('og:image:') && lostOgImage(tag))
        continue
      if (tag.key?.startsWith(TWITTER_IMAGE_FALLBACK_KEY) && lostOgImage(tag))
        continue
      if (tag.key === OG_URL_KEY) {
        if (typeof canonicalHref !== 'string' || !canonicalHref)
          continue
        result.push({ ...tag, props: { ...tag.props, content: canonicalHref } })
        continue
      }
      if (tag.key === TWITTER_CARD_KEY)
        twitterCardIndex = result.length
    }
    result.push(tag)
  }
  if (twitterCardIndex !== undefined) {
    const tag = result[twitterCardIndex]!
    result[twitterCardIndex] = { ...tag, props: { ...tag.props, content: result.some(isImage) ? 'summary_large_image' : 'summary' } }
  }
  return result
}
