import { injectHead } from '@unhead/vue'
import { InferSeoMetaPlugin, TemplateParamsPlugin } from '@unhead/vue/plugins'
import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'

export default defineNuxtPlugin(() => {
  const head = injectHead()

  // something quite wrong
  if (!head)
    return

  const { automaticTwitterTags } = useRuntimeConfig().public['seo-utils'] as { automaticTwitterTags?: boolean }

  head.use(TemplateParamsPlugin)
  head.use(InferSeoMetaPlugin({
    twitterCard: automaticTwitterTags === false ? false : undefined,
  }))
})
