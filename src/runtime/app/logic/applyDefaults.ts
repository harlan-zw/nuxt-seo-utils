import type { Link, UseHeadOptions, UseSeoMetaInput } from '@unhead/vue'
import type { QueryObject } from 'ufo'
import { injectHead, useHead, useSeoMeta } from '#imports'
import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'
import { createSitePathResolver } from '#site-config/app/composables/utils'
import { TemplateParamsPlugin } from '@unhead/vue/plugins'
import { useError, useRoute, useRuntimeConfig } from 'nuxt/app'
import { stringifyQuery } from 'ufo'
import { computed, toValue } from 'vue'

export function applyDefaults() {
  const siteConfig = useSiteConfig({
    resolveRefs: false,
  })

  const resolveCurrentLocale = () => {
    const locale = toValue(siteConfig.currentLocale) || toValue(siteConfig.defaultLocale) || 'en'
    // Normalize to BCP 47 format (hyphen-separated) for HTML lang attribute
    // Convert underscore to hyphen (e.g., en_US -> en-US)
    return locale.replace(/_/g, '-')
  }

  const head = injectHead()
  head.use(TemplateParamsPlugin)
  // get the head instance
  const { canonicalQueryWhitelist, canonicalLowercase } = useRuntimeConfig().public['seo-utils']
  const route = useRoute()
  const resolveUrl = createSitePathResolver({ withBase: true, absolute: true })
  const err = useError()
  const canonicalUrl = computed<Link | false>(() => {
    if (err.value) {
      return false
    }
    const { query } = route
    let url = (resolveUrl(route.path || '/').value || route.path)
    if (canonicalLowercase) {
      try {
        url = url.toLocaleLowerCase(resolveCurrentLocale())
      }
      catch {
        // fallback to default
        url = url.toLowerCase()
      }
    }
    // apply canonicalQueryWhitelist to query
    const filteredQuery = Object.fromEntries(
      Object.entries(query)
        .filter(([key]) => canonicalQueryWhitelist.includes(key))
        .sort(([a], [b]) => a.localeCompare(b)), // Sort params
    ) as QueryObject
    const href = Object.keys(filteredQuery).length
      ? `${url}?${stringifyQuery(filteredQuery)}`
      : url
    return { rel: 'canonical', href }
  })

  const minimalPriority: UseHeadOptions = {
    // give nuxt.config values higher priority
    tagPriority: 'low',
  }

  // needs higher priority
  useHead({
    htmlAttrs: { lang: resolveCurrentLocale },
    templateParams: {
      site: () => siteConfig,
      siteName: () => siteConfig.name,
    },
    titleTemplate: '%s %separator %siteName',
    link: [() => canonicalUrl.value],
  }, minimalPriority)

  const seoMeta: UseSeoMetaInput = {
    ogType: 'website',
    ogUrl: () => {
      const url = canonicalUrl.value
      return url ? url.href : false
    },
    ogLocale: () => {
      const locale = resolveCurrentLocale()
      if (locale) {
        // verify it's a locale and not just "en"
        const l = locale.replace('-', '_')
        if (l.includes('_')) {
          return l
        }
      }
      return false
    },
    ogSiteName: siteConfig.name,
  }
  if (siteConfig.description)
    seoMeta.description = siteConfig.description
  if (siteConfig.twitter) {
    // id must have the @ in it
    const id = siteConfig.twitter.startsWith('@')
      ? siteConfig.twitter
      : `@${siteConfig.twitter}`
    seoMeta.twitterCreator = id
    seoMeta.twitterSite = id
  }
  // TODO server only for some tags
  useSeoMeta(seoMeta, minimalPriority)
}
