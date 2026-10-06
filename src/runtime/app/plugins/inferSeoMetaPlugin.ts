import { InferSeoMetaPlugin, TemplateParamsPlugin } from '@unhead/vue/plugins'
import { defineNuxtPlugin, injectHead, useRuntimeConfig } from 'nuxt/app'

export default defineNuxtPlugin(() => {
  const head = injectHead()

  // something quite wrong
  if (!head)
    return

  const { automaticTwitterTags } = useRuntimeConfig().public['seo-utils'] as { automaticTwitterTags?: boolean }

  head.use(TemplateParamsPlugin)

  if (automaticTwitterTags === false) {
    head.use(InferSeoMetaPlugin({ twitterCard: false }))
  }
  else {
    head.use(InferSeoMetaPlugin())
  }
})
