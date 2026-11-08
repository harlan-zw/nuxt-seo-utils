import { defineNuxtPlugin, injectHead } from 'nuxt/app'
import { unref } from 'vue'
import { createSitePathResolver } from '#site-config/app/composables/utils'
import { createAbsoluteImageUrlsPlugin } from '../logic/absoluteImageUrls'

export default defineNuxtPlugin({
  enforce: 'post',
  setup() {
    const head = injectHead()
    // something quite wrong
    if (!head)
      return

    const resolver = createSitePathResolver({
      withBase: true,
      absolute: true,
      canonical: true,
    })
    head.use(createAbsoluteImageUrlsPlugin(path => unref(resolver(path))))
  },
})
