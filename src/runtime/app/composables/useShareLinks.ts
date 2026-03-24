import type { QueryObject } from 'ufo'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'
import { createSitePathResolver } from '#site-config/app/composables/utils'
import { useRoute, useRuntimeConfig } from 'nuxt/app'
import { stringifyQuery, withQuery } from 'ufo'
import { computed, toValue } from 'vue'

export type SharePlatform = 'twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'telegram' | 'reddit' | 'pinterest' | 'email'

export interface ShareLinkUtmParams {
  /**
   * Set to 'auto' to use the platform name as utm_source per link.
   * When a string (other than 'auto'), use that value for all platforms.
   * @default undefined
   */
  source?: 'auto' | (string & {})
  medium?: string
  campaign?: string
  term?: string
  content?: string
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
   * UTM tracking parameters. Defaults to `true` for automatic per-platform tracking
   * (utm_source = platform name, utm_medium = 'social'/'email'). Pass `false` to disable,
   * or an object for manual control.
   *
   * @example
   * // Auto: utm_source=twitter&utm_medium=social, utm_source=facebook&utm_medium=email, etc.
   * utm: true
   *
   * // Manual: same utm params on all platforms
   * utm: { source: 'newsletter', medium: 'email', campaign: 'launch' }
   *
   * // Hybrid: auto source + medium per platform, with custom campaign
   * utm: { source: 'auto', campaign: 'launch' }
   */
  utm?: MaybeRefOrGetter<boolean | ShareLinkUtmParams | undefined>
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
    /** A single hashtag (without #, e.g. "nuxt"). */
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

export type ShareLinks = Record<SharePlatform, string> & {
  /** The resolved canonical URL (without UTM params), useful for "copy link" buttons. */
  canonicalUrl: string
}

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
        fbUrl += `&hashtag=${encodeURIComponent(`#${options.facebook.hashtag}`)}`
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
export function useShareLinks(options: ShareLinksOptions = {}): ComputedRef<ShareLinks> {
  const route = useRoute()
  const siteConfig = useSiteConfig()
  const { canonicalQueryWhitelist, canonicalLowercase } = useRuntimeConfig().public['seo-utils'] as { canonicalQueryWhitelist: string[], canonicalLowercase: boolean }
  const resolveUrl = createSitePathResolver({ withBase: true, absolute: true })

  return computed<ShareLinks>(() => {
    const customUrl = toValue(options.url)
    let canonicalUrl: string
    if (customUrl) {
      canonicalUrl = customUrl
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
      canonicalUrl = Object.keys(filteredQuery).length
        ? `${url}?${stringifyQuery(filteredQuery)}`
        : url
    }

    const utm = toValue(options.utm) ?? true
    const title = toValue(options.title) || siteConfig.name || ''

    const platforms: SharePlatform[] = ['twitter', 'facebook', 'linkedin', 'whatsapp', 'telegram', 'reddit', 'pinterest', 'email']
    const result = { canonicalUrl } as ShareLinks
    for (const platform of platforms) {
      const query: Record<string, string> = {}
      if (utm === false) {
        // UTM explicitly disabled, skip
      }
      else if (utm === true || (typeof utm === 'object' && utm.source === 'auto')) {
        query.utm_source = platform
        query.utm_medium = (utm !== true && utm?.medium) || (platform === 'email' ? 'email' : 'social')
      }
      else if (utm) {
        if (utm.source)
          query.utm_source = utm.source
        if (utm.medium)
          query.utm_medium = utm.medium
      }
      if (typeof utm === 'object') {
        if (utm.campaign)
          query.utm_campaign = utm.campaign
        if (utm.term)
          query.utm_term = utm.term
        if (utm.content)
          query.utm_content = utm.content
      }
      const url = Object.keys(query).length > 0
        ? withQuery(canonicalUrl, query)
        : canonicalUrl
      result[platform] = buildShareUrl(platform, url, title, options)
    }
    return result
  })
}
