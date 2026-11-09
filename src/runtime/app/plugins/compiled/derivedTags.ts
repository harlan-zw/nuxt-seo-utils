import { defineNuxtPlugin, injectHead, useRuntimeConfig } from 'nuxt/app'
import { createDerivedTagsPlugin } from '../../logic/derivedTagsPlugin'
import { planDerivedTags, readEntryInputs } from '../../logic/headEntries'
import { defaultCanonicalEntry, ogUrlSetter } from '../../logic/ogUrlOverride'

// The derived tags plugin under compiler mode. Its render hook would send the whole head to the
// full runtime, so it registers only when a render could change a derived tag, and the server
// sets a derived og:url on its entry instead.
export default defineNuxtPlugin({
  name: 'nuxt-seo:derived-tags',
  setup(nuxtApp) {
    const head = injectHead() as any
    const { tagPriority } = useRuntimeConfig().public['seo-utils'] as { tagPriority?: unknown }
    const context = { ogUrlYields: tagPriority === 'low' }
    let registered = false
    const register = () => {
      if (registered)
        return
      // On the server, reading the entries settles their values, so canonical hrefs compare
      const plan = planDerivedTags(readEntryInputs(head, defaultCanonicalEntry(head)), context)
      if (plan._tag === 'None')
        return
      // On the server the default og:url takes its content now, so no render hook is needed.
      // The client keeps the plugin: its og:url entry follows its own effect.
      const setOgUrl = import.meta.server && plan._tag === 'OgUrl' ? ogUrlSetter(head) : undefined
      registered = true
      if (setOgUrl && plan._tag === 'OgUrl')
        setOgUrl(plan.content)
      else
        head.use(createDerivedTagsPlugin(head))
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
