import type { MaybeRefOrGetter } from 'vue'
import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'
import { createSitePathResolver } from '#site-config/app/composables/utils'
import { useRoute } from 'nuxt/app'
import { withQuery } from 'ufo'
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

export type ShareLinks = Record<SharePlatform, string>

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
  const resolveCanonical = createSitePathResolver({
    canonical: true,
    absolute: true,
  })
  const platforms = options.platforms || allPlatforms

  const links = computed<ShareLinks>(() => {
    const customUrl = toValue(options.url)
    const baseUrl = customUrl || resolveCanonical(route.path).value
    const utm = toValue(options.utm)
    const url = utm ? withQuery(baseUrl, utm as Record<string, string>) : baseUrl
    const title = toValue(options.title) || siteConfig.name || ''

    const result = {} as ShareLinks
    for (const platform of platforms) {
      result[platform] = buildShareUrl(platform, url, title)
    }
    return result
  })

  return links
}
