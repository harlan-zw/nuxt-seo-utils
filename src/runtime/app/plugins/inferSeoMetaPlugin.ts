import { InferSeoMetaPlugin } from '@unhead/addons'
import { injectHead } from '@unhead/vue'
import { defineNuxtPlugin } from 'nuxt/app'
import { TemplateParamsPlugin } from 'unhead/plugins'

export default defineNuxtPlugin(() => {
  const head = injectHead()

  // something quite wrong
  if (!head)
    return

  head.use(TemplateParamsPlugin)
  head.use(InferSeoMetaPlugin())
})
