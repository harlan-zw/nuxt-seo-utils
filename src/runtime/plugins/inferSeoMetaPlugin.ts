import { injectHead } from '@unhead/vue'
import { InferSeoMetaPlugin } from '@unhead/addons'
import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin(() => {
  const head = injectHead()

  // something quite wrong
  if (!head)
    return

  head.use(InferSeoMetaPlugin())
})
