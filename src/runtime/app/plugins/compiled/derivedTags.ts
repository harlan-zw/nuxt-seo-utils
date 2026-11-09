import { defineNuxtPlugin, injectHead } from 'nuxt/app'
import { createDerivedTagsTransform } from '../../logic/tagTransforms'

// The derived tags plugin under compiler mode: a tag transform, so the head keeps the server
// memo and the compiled runtime on the client.
export default defineNuxtPlugin({
  name: 'nuxt-seo:derived-tags',
  setup() {
    const head = injectHead() as any
    head.use(createDerivedTagsTransform(head))
  },
})
