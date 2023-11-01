import type { Head } from '@unhead/vue'
import { injectHead } from '@unhead/vue'
import { defineNuxtPlugin, useSiteConfig } from '#imports'

export default defineNuxtPlugin(() => {
  const head = injectHead()
  // something quite wrong
  if (!head)
    return

  const siteConfig = { ...useSiteConfig() } as Record<string, any>
  delete siteConfig._context

  const separator = siteConfig.separator || siteConfig.titleSeparator
  const input: Head = {
    meta: [],
    templateParams: {
      site: siteConfig,
      separator,
      titleSeparator: separator,
      // support legacy
      siteUrl: siteConfig.url,
      siteName: siteConfig.name,
    },
  }
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
  head.push(input)
})
