import { defineNuxtPlugin, injectHead, useRuntimeConfig } from 'nuxt/app'
import { shapes } from '#nuxt-seo-utils/compiled-head'
import { createDerivedTagsPlugin } from '../../logic/derivedTagsPlugin'
import { needsDerivedTags, readEntryInputs } from '../../logic/headEntries'

// The derived tags plugin under compiler mode. Its render hook would send the whole head to the
// full runtime, so it registers only when a render could change a derived tag.
export default defineNuxtPlugin({
  name: 'nuxt-seo:derived-tags',
  setup(nuxtApp) {
    const head = injectHead() as any
    const { tagPriority } = useRuntimeConfig().public['seo-utils'] as { tagPriority?: unknown }
    const context = { defaultCanonicalTags: shapes?.canonical?.tags, ogUrlYields: tagPriority === 'low' }
    let registered = false
    const register = () => {
      if (!registered && needsDerivedTags(readEntryInputs(head.entries.values()), context)) {
        registered = true
        head.use(createDerivedTagsPlugin(head))
      }
    }
    if (import.meta.server) {
      // After the entries of every plugin settle in their own `app:rendered` listeners
      nuxtApp.hooks.hookOnce('app:created', () => {
        nuxtApp.hooks.hook('app:rendered', register)
      })
    }
    else {
      // The compiled runtime checks for render hooks after this hook, before it draws
      head.hooks.hook('dom:beforeRender', register)
    }
  },
})
