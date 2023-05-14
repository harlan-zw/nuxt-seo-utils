import { injectHead } from '@unhead/vue'
import { InferSeoMetaPlugin } from '@unhead/addons'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin(() => {
  const head = injectHead()
  const config = useRuntimeConfig().public

  // something quite wrong
  if (!head)
    return

  const { seoOptimise } = config['nuxt-seo-experiments']

  if (seoOptimise)
    head.use(InferSeoMetaPlugin())

  const separator = config.separator || config.titleSeparator || '|'
  head.push({
    templateParams: {
      ...config,
      separator,
      titleSeparator: separator,
    },
  })
})
