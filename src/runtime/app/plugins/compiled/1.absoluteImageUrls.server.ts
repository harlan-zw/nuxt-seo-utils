import { defineNuxtPlugin, injectHead } from 'nuxt/app'
import { unref } from 'vue'
import { createSitePathResolver } from '#site-config/app/composables/utils'
import { createAbsoluteImageUrlsTransform } from '../../logic/tagTransforms'

// The absolute image URLs plugin under compiler mode: a tag transform, keyed on the site URL.
export default defineNuxtPlugin({
  enforce: 'post',
  setup() {
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
    head.use(createAbsoluteImageUrlsTransform(head, resolve, resolve('/')))
  },
})
