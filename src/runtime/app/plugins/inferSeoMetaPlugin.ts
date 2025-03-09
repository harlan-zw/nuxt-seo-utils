import { injectHead } from '#imports'
import { InferSeoMetaPlugin } from '@unhead/addons'
import { defineNuxtPlugin } from 'nuxt/app'

export default defineNuxtPlugin(() => {
  const head = injectHead()

  // something quite wrong
  if (!head)
    return

  head.use(InferSeoMetaPlugin())
})
