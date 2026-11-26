import type { SerializableHead } from '@unhead/vue/types'
import { defineNuxtPlugin, injectHead, useError, useRuntimeConfig } from 'nuxt/app'
import { serverOnlyCrawlerDefaults } from '#build/seo-utils-build-options'
import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'

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
  const input: SerializableHead = {
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
    if (import.meta.server ? !useError().value : !serverOnlyCrawlerDefaults) {
      input.meta = [{
        name: 'description',
        content: '%site.description',
        tagPriority,
      }]
    }
  }
  head.push(input)
})
