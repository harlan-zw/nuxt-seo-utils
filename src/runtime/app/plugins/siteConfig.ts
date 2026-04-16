import type { Head } from '@unhead/vue/types'
import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'
import { injectHead } from '@unhead/vue'
import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'

export default defineNuxtPlugin(() => {
  const head = injectHead()
  // something quite wrong
  if (!head)
    return

  const { tagPriority, separator, titleSeparator } = useRuntimeConfig().public['seo-utils'] as {
    tagPriority: number | 'critical' | 'high' | 'low' | `before:${string}` | `after:${string}` | undefined
    separator?: string
    titleSeparator?: string
  }
  const siteConfig = useSiteConfig()
  const resolvedSeparator = siteConfig.separator || separator || siteConfig.titleSeparator || titleSeparator
  const resolvedTitleSeparator = siteConfig.titleSeparator || titleSeparator || siteConfig.separator || separator
  const input: Head = {
    meta: [],
    templateParams: {
      site: siteConfig,
      // support legacy
      siteUrl: siteConfig.url,
      siteName: siteConfig.name,
    },
  }
  if (resolvedSeparator)
    input.templateParams!.separator = resolvedSeparator
  if (resolvedTitleSeparator)
    input.templateParams!.titleSeparator = resolvedTitleSeparator
  if (siteConfig.description) {
    input.templateParams!.siteDescription = siteConfig.description
    // we can setup a meta description
    input.meta!.push(
      {
        name: 'description',
        content: '%site.description',
        tagPriority,
      },
    )
  }
  head.push(input)
})
