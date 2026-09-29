import type { HeadTag } from '@unhead/vue/types'
import { OG_URL_KEY, TWITTER_IMAGE_FALLBACK_KEY } from '../../shared/derivedTagKeys'

// Unhead packs the entry index into the high bits of a tag position.
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
 */
export function syncDerivedTags(tags: HeadTag[], entriesWithOgImage: Set<number>): HeadTag[] {
  const winningOgImageEntries = new Set(tags.filter(isOgImage).map(entryOf))
  const canonicalHref = tags.find(tag => tag.tag === 'link' && tag.props.rel === 'canonical')?.props.href
  const lostOgImage = (tag: HeadTag): boolean => {
    const entry = entryOf(tag)
    return entry !== undefined && entriesWithOgImage.has(entry) && !winningOgImageEntries.has(entry)
  }
  return tags.flatMap((tag) => {
    if (tag.tag !== 'meta')
      return [tag]
    if (metaKey(tag)?.startsWith('og:image:') && lostOgImage(tag))
      return []
    if (tag.key?.startsWith(TWITTER_IMAGE_FALLBACK_KEY) && lostOgImage(tag))
      return []
    if (tag.key === OG_URL_KEY) {
      if (typeof canonicalHref !== 'string' || !canonicalHref)
        return []
      return [{ ...tag, props: { ...tag.props, content: canonicalHref } }]
    }
    return [tag]
  })
}
