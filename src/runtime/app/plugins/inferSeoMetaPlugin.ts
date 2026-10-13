import { InferSeoMetaPlugin, TemplateParamsPlugin } from '@unhead/vue/plugins'
import { defineNuxtPlugin, injectHead, useRuntimeConfig } from 'nuxt/app'
import { TWITTER_CARD_KEY } from '../../shared/derivedTagKeys'

export default defineNuxtPlugin(() => {
  const head = injectHead()

  // something quite wrong
  if (!head)
    return

  const { automaticTwitterTags } = useRuntimeConfig().public['seo-utils'] as { automaticTwitterTags?: boolean }

  head.use(TemplateParamsPlugin)
  // Unhead always infers `summary_large_image`, even without an image.
  head.use(InferSeoMetaPlugin({ twitterCard: false }))

  if (automaticTwitterTags !== false) {
    // The derived tags plugin sets the content from the resolved image tags.
    head.push({
      meta: [{ name: 'twitter:card', content: 'summary', key: TWITTER_CARD_KEY, tagPriority: 'low' }],
    })
  }
})
