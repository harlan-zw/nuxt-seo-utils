import type { UseHeadOptions, UseSeoMetaInput } from '@unhead/vue'
import type { QueryObject } from 'ufo'
import type { Ref } from 'vue'
import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'
import { createSitePathResolver } from '#site-config/app/composables/utils'
import { useHead, useSeoMeta } from '@unhead/vue'
import { useError, useRoute, useRuntimeConfig } from 'nuxt/app'
import { stringifyQuery } from 'ufo'
import { computed, ref, watch } from 'vue'

export function applyDefaults(i18n: { locale: Ref<string> }) {
  // get the head instance
  const { canonicalQueryWhitelist, canonicalLowercase } = useRuntimeConfig().public['seo-utils']
  const siteConfig = useSiteConfig()
  const route = useRoute()
  const resolveUrl = createSitePathResolver({ withBase: true, absolute: true })
  const err = useError()
  const canonicalUrl = computed<string | null>(() => {
    if (err.value) {
      return null
    }
    const { query } = route
    let url = (resolveUrl(route.path || '/').value || route.path)
    if (canonicalLowercase) {
      url = url.toLocaleLowerCase(siteConfig.currentLocale)
    }
    // apply canonicalQueryWhitelist to query
    const filteredQuery = Object.fromEntries(
      Object.entries(query).filter(([key]) => canonicalQueryWhitelist.includes(key)),
    ) as QueryObject
    return Object.keys(filteredQuery).length
      ? `${url}?${stringifyQuery(filteredQuery)}`
      : url
  })
  const templateParams = ref({ site: siteConfig, siteName: siteConfig.name })
  if (import.meta.client) {
    watch(siteConfig, (v) => {
      templateParams.value = { site: v, siteName: v.name || '' }
    }, {
      deep: true,
    })
  }

  const minimalPriority: UseHeadOptions = {
    // give nuxt.config values higher priority
    tagPriority: 101,
  }

  // needs higher priority
  useHead({
    htmlAttrs: { lang: i18n.locale },
    templateParams,
    titleTemplate: '%s %separator %siteName',
    link: [{ rel: 'canonical', href: () => canonicalUrl.value }],
  }, minimalPriority)

  const seoMeta: UseSeoMetaInput = {
    ogType: 'website',
    ogUrl: () => canonicalUrl.value,
    ogLocale: () => i18n.locale.value,
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
