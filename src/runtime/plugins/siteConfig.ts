import type { Head } from '@unhead/vue'
import { injectHead } from '@unhead/vue'
import { defineNuxtPlugin, useRuntimeConfig, useSiteConfig } from '#imports'

export default defineNuxtPlugin(() => {
  const head = injectHead()
  // something quite wrong
  if (!head)
    return

  const siteConfig = useSiteConfig()

  const separator = siteConfig.separator || siteConfig.titleSeparator
  const input: Head = {
    meta: [],
    templateParams: {
      ...useRuntimeConfig().public,
      site: siteConfig,
      separator,
      titleSeparator: separator,
      // support legacy
      siteUrl: siteConfig.url,
      siteName: siteConfig.name,
      siteDescription: siteConfig.description,
    },
  }
  if (siteConfig.description) {
    // we can setup a meta description
    input.meta!.push(
      {
        name: 'description',
        content: '%site.description',
      },
    )
  }
  head.push(input)
})
