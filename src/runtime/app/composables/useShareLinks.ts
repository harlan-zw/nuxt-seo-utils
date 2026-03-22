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
   * UTM parameters to append to the shared URL.
   */
  utm?: MaybeRefOrGetter<ShareLinkUtmParams | undefined>
  /**
   * Twitter/X specific options.
   */
  twitter?: {
    /** Twitter username to attribute (without @). */
    via?: string
    /** Hashtags to include (without #). */
    hashtags?: string[]
  }
  /**
   * Facebook specific options.
   */
  facebook?: {
    /** Pre-filled text to accompany the share. */
    quote?: string
    /** A single hashtag (with #, e.g. "#nuxt"). */
    hashtag?: string
  }
  /**
   * Pinterest specific options.
   */
  pinterest?: {
    /** Direct image URL to pin. */
    media?: MaybeRefOrGetter<string | undefined>
  }
}

export type ShareLinks = Record<SharePlatform, string>

function buildShareUrl(platform: SharePlatform, url: string, title: string, options: ShareLinksOptions): string {
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  switch (platform) {
    case 'twitter': {
      let twitterUrl = `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`
      if (options.twitter?.via)
        twitterUrl += `&via=${encodeURIComponent(options.twitter.via)}`
      if (options.twitter?.hashtags?.length)
        twitterUrl += `&hashtags=${encodeURIComponent(options.twitter.hashtags.join(','))}`
      return twitterUrl
    }
    case 'facebook': {
      let fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
      if (options.facebook?.quote)
        fbUrl += `&quote=${encodeURIComponent(options.facebook.quote)}`
      if (options.facebook?.hashtag)
        fbUrl += `&hashtag=${encodeURIComponent(options.facebook.hashtag)}`
      return fbUrl
    }
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
    case 'whatsapp':
      return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`
    case 'reddit':
      return `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`
    case 'pinterest': {
      let pinUrl = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`
      const media = toValue(options.pinterest?.media)
      if (media)
        pinUrl += `&media=${encodeURIComponent(media)}`
      return pinUrl
    }
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

    const platforms: SharePlatform[] = ['twitter', 'facebook', 'linkedin', 'whatsapp', 'telegram', 'reddit', 'pinterest', 'email']
    const result = {} as ShareLinks
    for (const platform of platforms) {
      result[platform] = buildShareUrl(platform, url, title, options)
    }
    return result
  })

  return links
}
