import type { Head } from '@unhead/vue'
import { useSiteConfig } from '#imports'
import { injectHead } from '@unhead/vue'
import { defineNuxtPlugin } from 'nuxt/app'

export default defineNuxtPlugin(() => {
  const head = injectHead()
  // something quite wrong
  if (!head)
    return

  const siteConfig = useSiteConfig()
  const input: Head = {
    meta: [],
    templateParams: {
      site: siteConfig,
      // support legacy
      siteUrl: siteConfig.url,
      siteName: siteConfig.name,
    },
  }
  if (siteConfig.separator)
    input.templateParams!.separator = siteConfig.separator
  if (siteConfig.titleSeparator)
    input.templateParams!.titleSeparator = siteConfig.titleSeparator
  if (siteConfig.description) {
    input.templateParams!.siteDescription = siteConfig.description
    // we can setup a meta description
    input.meta!.push(
      {
        name: 'description',
        content: '%site.description',
      },
    )
  }
  head.push(input, { tagPriority: 150 })
})
