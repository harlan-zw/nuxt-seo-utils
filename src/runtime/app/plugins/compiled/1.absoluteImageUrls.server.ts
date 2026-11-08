import { defineNuxtPlugin, injectHead } from 'nuxt/app'
import { unref } from 'vue'
import { createSitePathResolver } from '#site-config/app/composables/utils'
import { createAbsoluteImageUrlsPlugin } from '../../logic/absoluteImageUrls'
import { absoluteImageEntries } from '../../logic/headEntries'

// The absolute image URLs plugin under compiler mode. Its render hook would send the whole head
// to the full pipeline, so it rewrites the input of each entry with a relative image URL instead,
// once the app has rendered. Input it cannot read keeps the render hook.
export default defineNuxtPlugin({
  enforce: 'post',
  setup(nuxtApp) {
    const head = injectHead() as any
    // something quite wrong
    if (!head)
      return

    const resolver = createSitePathResolver({
      withBase: true,
      absolute: true,
      canonical: true,
    })
    const resolve = (path: string) => unref(resolver(path))
    nuxtApp.hooks.hookOnce('app:created', () => {
      nuxtApp.hooks.hook('app:rendered', () => {
        const rewrites = absoluteImageEntries(head.entries.values(), resolve)
        if (rewrites === 'Plugin') {
          head.use(createAbsoluteImageUrlsPlugin(resolve))
          return
        }
        for (const [entry, input] of rewrites)
          entry.input = input
      })
    })
  },
})
