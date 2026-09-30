import { defineNuxtPlugin, injectHead } from 'nuxt/app'
import { ogImageEntryIds, syncDerivedTags } from '../logic/syncDerivedTags'

export default defineNuxtPlugin({
  name: 'nuxt-seo:derived-tags',
  setup() {
    const head = injectHead()
    head.use({
      key: 'nuxt-seo-utils:derived-tags',
      hooks: {
        'tags:beforeResolve': (ctx) => {
          // Deduplication already dropped the losing og:image tags, so read each entry's own tags.
          const entryTags = [...head.entries.values()].map(entry => entry._tags || entry._precomputedTags || [])
          ctx.tags = syncDerivedTags(ctx.tags, ogImageEntryIds(entryTags))
        },
      },
    })
  },
})
