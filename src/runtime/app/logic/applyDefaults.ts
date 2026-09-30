import type { Link, UseHeadOptions, UseSeoMetaInput } from '@unhead/vue'

import { TemplateParamsPlugin } from '@unhead/vue/plugins'
import { injectHead, useError, useHead, useRoute, useRuntimeConfig, useSeoMeta } from 'nuxt/app'
import { computed, toValue } from 'vue'
import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'
import { createSitePathResolver } from '#site-config/app/composables/utils'
import { resolveCanonicalUrl } from '../../shared/canonicalUrl'
import { OG_URL_KEY } from '../../shared/derivedTagKeys'

const LOCALE_UNDERSCORE_RE = /_/g

export function applyDefaults(): void {
  const siteConfig = useSiteConfig({
    resolveRefs: false,
  })

  const resolveCurrentLocale = (): string => {
    const locale = toValue(siteConfig.currentLocale) || toValue(siteConfig.defaultLocale) || 'en'
    // Normalize to BCP 47 format (hyphen-separated) for HTML lang attribute
    // Convert underscore to hyphen (e.g., en_US -> en-US)
    return locale.replace(LOCALE_UNDERSCORE_RE, '-')
  }

  const head = injectHead()
  head.use(TemplateParamsPlugin)
  // get the head instance
  const { canonicalQueryWhitelist, canonicalLowercase, tagPriority, separator, titleSeparator } = useRuntimeConfig().public['seo-utils'] as {
    canonicalQueryWhitelist: string[]
    canonicalLowercase: boolean
    tagPriority: number | undefined
    separator?: string
    titleSeparator?: string
  }
  const route = useRoute()
  const resolveUrl = createSitePathResolver({ withBase: true, absolute: true })
  const err = useError()
  const resolveSeparator = () => toValue(siteConfig.separator) || separator || toValue(siteConfig.titleSeparator) || titleSeparator
  const resolveTitleSeparator = () => toValue(siteConfig.titleSeparator) || titleSeparator || toValue(siteConfig.separator) || separator
  const canonicalUrl = computed<Link | false>(() => {
    if (err.value) {
      return false
    }
    const url = resolveUrl(route.path || '/').value || route.path
    const href = resolveCanonicalUrl(url, route.query, {
      lowercase: canonicalLowercase,
      locale: resolveCurrentLocale(),
      queryWhitelist: canonicalQueryWhitelist,
    })
    return { rel: 'canonical', href }
  })

  const minimalPriority: UseHeadOptions = {
    // give nuxt.config values higher priority
    tagPriority: 'low',
  }

  const seoMetaPriority: UseHeadOptions = {
    tagPriority,
  }

  // needs higher priority
  useHead({
    htmlAttrs: { lang: resolveCurrentLocale },
    templateParams: {
      site: () => siteConfig,
      siteName: () => siteConfig.name,
      separator: resolveSeparator,
      titleSeparator: resolveTitleSeparator,
    },
    titleTemplate: () => err.value ? '%s' : '%s %separator %siteName',
    link: [() => canonicalUrl.value],
  }, minimalPriority)

  // og:locale is set at low priority so @nuxtjs/i18n can override it
  useSeoMeta({
    ogLocale: () => {
      const locale = resolveCurrentLocale()
      if (locale) {
        const l = locale.replace('-', '_')
        if (l.includes('_')) {
          return l
        }
      }
      return false
    },
  }, minimalPriority)

  const seoMeta: UseSeoMetaInput = {
    ogType: 'website',
    ogSiteName: siteConfig.name,
  }
  // SSR-only default description so page-level descriptions are not overridden
  // during hydration by client-side defaults registered with useSeoMeta. The
  // siteConfig plugin also registers a low-priority client-side fallback.
  if (import.meta.server && siteConfig.description)
    useSeoMeta({ description: siteConfig.description }, minimalPriority)
  if (siteConfig.twitter) {
    // id must have the @ in it
    const id = siteConfig.twitter.startsWith('@')
      ? siteConfig.twitter
      : `@${siteConfig.twitter}`
    seoMeta.twitterCreator = id
    seoMeta.twitterSite = id
  }
  // TODO server only for some tags
  useSeoMeta(seoMeta, seoMetaPriority)
  // The derived tags plugin replaces this content with the resolved canonical href,
  // so a page-level canonical also moves og:url.
  useHead({
    meta: [{
      property: 'og:url',
      content: () => {
        const url = canonicalUrl.value
        return url ? url.href : false
      },
      key: OG_URL_KEY,
    }],
  }, seoMetaPriority)
}
