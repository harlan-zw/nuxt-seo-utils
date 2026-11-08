import type { SerializableHead } from '@unhead/vue/types'

export interface SiteConfigHeadOptions {
  tagPriority: number | 'critical' | 'high' | 'low' | `before:${string}` | `after:${string}` | undefined
  separator?: string
  titleSeparator?: string
}

interface SiteConfigLike {
  url?: string
  name?: string
  description?: string
  separator?: string
  titleSeparator?: string
}

/** The template params of the site config, and a low priority description that reads them. */
export function siteConfigHeadInput(siteConfig: SiteConfigLike, { tagPriority, separator, titleSeparator }: SiteConfigHeadOptions): SerializableHead {
  const resolvedSeparator = siteConfig.separator || separator || siteConfig.titleSeparator || titleSeparator
  const resolvedTitleSeparator = siteConfig.titleSeparator || titleSeparator || siteConfig.separator || separator
  const input: SerializableHead = {
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
  return input
}
