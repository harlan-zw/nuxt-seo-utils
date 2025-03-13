import type { Link, UseHeadOptions, UseSeoMetaInput } from '@unhead/vue'
import type { QueryObject } from 'ufo'
import type { Ref } from 'vue'
import { injectHead, useHead, useSeoMeta } from '#imports'
import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'
import { createSitePathResolver } from '#site-config/app/composables/utils'
import { TemplateParamsPlugin } from '@unhead/vue/plugins'
import { useError, useRoute, useRuntimeConfig } from 'nuxt/app'
import { stringifyQuery } from 'ufo'
import { computed } from 'vue'

export function applyDefaults(i18n: { locale: Ref<string> }) {
  const head = injectHead()
  head.use(TemplateParamsPlugin)
  // get the head instance
  const { canonicalQueryWhitelist, canonicalLowercase } = useRuntimeConfig().public['seo-utils']
  const siteConfig = useSiteConfig()
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
        url = url.toLocaleLowerCase(siteConfig.currentLocale || 'en')
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
    htmlAttrs: { lang: i18n.locale },
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
      if (i18n.locale.value) {
        // verify it's a locale and not just "en"
        const locale = i18n.locale.value.replace('-', '_')
        if (locale.includes('_')) {
          return locale
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
