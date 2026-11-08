import type { HeadPlugin, Unhead } from 'unhead/types'
import { ogImageEntryIds, syncDerivedTags } from './syncDerivedTags'

export const DERIVED_TAGS_PLUGIN_KEY = 'nuxt-seo-utils:derived-tags'

/**
 * Keeps `og:image:*`, the public `twitter:image` copy, and `og:url` in step with the tags that win.
 */
export function createDerivedTagsPlugin(head: Unhead<any, any>): HeadPlugin {
  return {
    key: DERIVED_TAGS_PLUGIN_KEY,
    hooks: {
      'tags:beforeResolve': (ctx) => {
        // Deduplication already dropped the losing og:image tags, so read each entry's own tags.
        const entryTags = [...head.entries.values()].map(entry => entry._tags || entry._precomputedTags || [])
        ctx.tags = syncDerivedTags(ctx.tags, ogImageEntryIds(entryTags))
      },
    },
  }
}
