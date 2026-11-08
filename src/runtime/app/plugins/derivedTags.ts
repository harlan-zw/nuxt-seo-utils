import { defineNuxtPlugin, injectHead } from 'nuxt/app'
import { createDerivedTagsPlugin } from '../logic/derivedTagsPlugin'

export default defineNuxtPlugin({
  name: 'nuxt-seo:derived-tags',
  setup() {
    const head = injectHead()
    head.use(createDerivedTagsPlugin(head))
  },
})
