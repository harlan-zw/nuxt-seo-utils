import type { QueryObject } from 'ufo'
import type { MaybeRefOrGetter } from 'vue'
import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'
import { createSitePathResolver } from '#site-config/app/composables/utils'
import { useRoute, useRuntimeConfig } from 'nuxt/app'
import { stringifyQuery, withQuery } from 'ufo'
import { computed, toValue } from 'vue'

export type SharePlatform = 'twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'telegram' | 'reddit' | 'pinterest' | 'email'

export interface ShareLinkUtmParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

export interface ShareLinksOptions {
  /**
   * Override the URL to share. Defaults to the canonical URL of the current page.
   */
  url?: MaybeRefOrGetter<string | undefined>
  /**
   * The title/text to share. Defaults to the site name from site config.
   */
  title?: MaybeRefOrGetter<string | undefined>
  /**
   * Platforms to generate share links for.
   * @default ['twitter', 'facebook', 'linkedin', 'whatsapp', 'telegram', 'reddit', 'pinterest', 'email']
   */
  platforms?: SharePlatform[]
  /**
   * UTM parameters to append to the shared URL.
   */
  utm?: MaybeRefOrGetter<ShareLinkUtmParams | undefined>
}

export type ShareLinks = Partial<Record<SharePlatform, string>>

const allPlatforms: SharePlatform[] = ['twitter', 'facebook', 'linkedin', 'whatsapp', 'telegram', 'reddit', 'pinterest', 'email']

function buildShareUrl(platform: SharePlatform, url: string, title: string): string {
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  switch (platform) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
    case 'whatsapp':
      return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`
    case 'reddit':
      return `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`
    case 'pinterest':
      return `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`
    case 'email':
      return `mailto:?subject=${encodedTitle}&body=${encodedUrl}`
  }
}

/**
 * Generate social share URLs for the current page across multiple platforms.
 *
 * Uses the site config base URL and canonical URL logic to build share links
 * with optional UTM parameter tracking.
 *
 * @docs https://nuxtseo.com/nuxt-seo/api/share-links
 */
export function useShareLinks(options: ShareLinksOptions = {}) {
  const route = useRoute()
  const siteConfig = useSiteConfig()
  const { canonicalQueryWhitelist, canonicalLowercase } = useRuntimeConfig().public['seo-utils'] as { canonicalQueryWhitelist: string[], canonicalLowercase: boolean }
  const resolveUrl = createSitePathResolver({ withBase: true, absolute: true })
  const platforms = options.platforms || allPlatforms

  const links = computed<ShareLinks>(() => {
    const customUrl = toValue(options.url)

    let baseUrl: string
    if (customUrl) {
      baseUrl = customUrl
    }
    else {
      let url = resolveUrl(route.path || '/').value || route.path
      if (canonicalLowercase) {
        url = url.toLowerCase()
      }
      const filteredQuery = Object.fromEntries(
        Object.entries(route.query)
          .filter(([key]) => canonicalQueryWhitelist.includes(key))
          .sort(([a], [b]) => a.localeCompare(b)),
      ) as QueryObject
      baseUrl = Object.keys(filteredQuery).length
        ? `${url}?${stringifyQuery(filteredQuery)}`
        : url
    }

    const utm = toValue(options.utm)
    let url = baseUrl
    if (utm) {
      const query: Record<string, string> = {}
      for (const [key, value] of Object.entries(utm)) {
        if (value != null) {
          query[key] = String(value)
        }
      }
      if (Object.keys(query).length > 0) {
        url = withQuery(baseUrl, query)
      }
    }

    const title = toValue(options.title) || siteConfig.name || ''

    const result: ShareLinks = {}
    for (const platform of platforms) {
      result[platform] = buildShareUrl(platform, url, title)
    }
    return result
  })

  return links
}
