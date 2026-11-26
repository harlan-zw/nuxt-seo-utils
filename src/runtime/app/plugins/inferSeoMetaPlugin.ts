import { InferSeoMetaPlugin, TemplateParamsPlugin } from '@unhead/vue/plugins'
import { defineNuxtPlugin, injectHead, useError, useRuntimeConfig } from 'nuxt/app'
import { serverOnlyCrawlerDefaults } from '#build/seo-utils-build-options'

export default defineNuxtPlugin(() => {
  const head = injectHead()

  // something quite wrong
  if (!head)
    return

  head.use(TemplateParamsPlugin)

  if (import.meta.server && useError().value)
    return

  if (!import.meta.server && serverOnlyCrawlerDefaults)
    return

  const { automaticTwitterTags } = useRuntimeConfig().public['seo-utils'] as { automaticTwitterTags?: boolean }
  if (automaticTwitterTags === false) {
    head.use(InferSeoMetaPlugin({ twitterCard: false }))
  }
  else {
    head.use(InferSeoMetaPlugin())
  }
})
