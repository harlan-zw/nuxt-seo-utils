import { injectHead } from '@unhead/vue'
import { InferSeoMetaPlugin, TemplateParamsPlugin } from '@unhead/vue/plugins'
import { defineNuxtPlugin } from 'nuxt/app'

export default defineNuxtPlugin(() => {
  const head = injectHead()

  // something quite wrong
  if (!head)
    return

  head.use(TemplateParamsPlugin)
  head.use(InferSeoMetaPlugin())
})
