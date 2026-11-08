import type { UseHeadOptions } from '@unhead/vue'
import type { HeadChoice } from './compiledHead'
import type { SiteHeadPayload } from './siteHead'
import { TemplateParamsPlugin } from '@unhead/vue/plugins'
import { VueResolver, walkResolver } from '@unhead/vue/utils'
import { injectHead, useError, useNuxtApp, useRoute, useRuntimeConfig, useState } from 'nuxt/app'
import { computed, toValue } from 'vue'
import { tagPriority as buildTagPriority, shapes } from '#nuxt-seo-utils/compiled-head'
import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'
import { createSitePathResolver } from '#site-config/app/composables/utils'
import { resolveCanonicalUrl } from '../../shared/canonicalUrl'
import { compiledHeadShapes } from '../../shared/compiledHeadShapes'
import { chooseShape, pushChosenHead } from './compiledHead'
import { provideOgUrlSetter } from './ogUrlOverride'
import { chooseClientSiteHead, chooseServerSiteHead } from './siteHead'

const LOCALE_UNDERSCORE_RE = /_/g

export const SITE_HEAD_STATE_KEY = 'nuxt-seo-utils:compiled-head'

export function useSiteHeadPayload() {
  return useState<SiteHeadPayload>(SITE_HEAD_STATE_KEY, () => ({}))
}

/** Chooses compiled tags for site config input: compiled on the server, read from the payload on the client. */
export function chooseSiteHead(payload: SiteHeadPayload, id: string, input: object): HeadChoice {
  return import.meta.server ? chooseServerSiteHead(payload, id, input) : chooseClientSiteHead(payload, id, input)
}

/**
 * `applyDefaults` under compiler mode. It pushes the same tags in the same order, as compiled
 * tags. The `useHead` call of `applyDefaults` becomes four entries, one for each part that
 * changes on its own: the locale, the site template params, the title template, and the
 * canonical link. Tags from consecutive entries keep their order.
 */
export function applyCompiledDefaults(): void {
  const nuxtApp = useNuxtApp()
  const head = injectHead() as any
  const siteConfig = useSiteConfig({
    resolveRefs: false,
  })
  const payload = useSiteHeadPayload()
  head.use(TemplateParamsPlugin)

  const resolveCurrentLocale = (): string => {
    const locale = toValue(siteConfig.currentLocale) || toValue(siteConfig.defaultLocale) || 'en'
    // Normalize to BCP 47 format (hyphen-separated) for HTML lang attribute
    return locale.replace(LOCALE_UNDERSCORE_RE, '-')
  }

  const { canonicalQueryWhitelist, canonicalLowercase, tagPriority, separator, titleSeparator } = useRuntimeConfig().public['seo-utils'] as {
    canonicalQueryWhitelist: string[]
    canonicalLowercase: boolean
    tagPriority: UseHeadOptions['tagPriority']
    separator?: string
    titleSeparator?: string
  }
  // The build compiled the shapes that hold `tagPriority` with the module option. A runtime
  // config override keeps those entries as normal input.
  const prioritized = (tagPriority ?? null) === buildTagPriority ? shapes : undefined
  const route = useRoute()
  const resolveUrl = createSitePathResolver({ withBase: true, absolute: true })
  const err = useError()
  const resolveSeparator = () => toValue(siteConfig.separator) || separator || toValue(siteConfig.titleSeparator) || titleSeparator
  const resolveTitleSeparator = () => toValue(siteConfig.titleSeparator) || titleSeparator || toValue(siteConfig.separator) || separator
  const canonicalHref = computed<string | false>(() => {
    if (err.value)
      return false
    const url = resolveUrl(route.path || '/').value || route.path
    return resolveCanonicalUrl(url, route.query, {
      lowercase: canonicalLowercase,
      locale: resolveCurrentLocale(),
      queryWhitelist: canonicalQueryWhitelist,
    })
  })

  pushChosenHead(nuxtApp, head, () => {
    const lang = resolveCurrentLocale()
    return chooseShape(shapes?.lang, [lang], () => compiledHeadShapes.lang(lang))
  })
  pushChosenHead(nuxtApp, head, () => chooseSiteHead(payload.value, 'defaults', walkResolver({
    templateParams: {
      site: siteConfig,
      siteName: siteConfig.name,
      separator: resolveSeparator(),
      titleSeparator: resolveTitleSeparator(),
    },
  }, VueResolver) as object), { tagPriority: 'low' })
  pushChosenHead(nuxtApp, head, () => err.value
    ? chooseShape(shapes?.errorTitleTemplate, [], compiledHeadShapes.errorTitleTemplate)
    : chooseShape(shapes?.titleTemplate, [], compiledHeadShapes.titleTemplate))
  pushChosenHead(nuxtApp, head, () => {
    const href = canonicalHref.value
    return chooseShape(shapes?.canonical, [href], () => compiledHeadShapes.canonical(href))
  })

  // og:locale is set at low priority so @nuxtjs/i18n can override it
  pushChosenHead(nuxtApp, head, () => {
    const locale = resolveCurrentLocale().replace('-', '_')
    const ogLocale = locale.includes('_') ? locale : false
    return chooseShape(shapes?.ogLocale, [ogLocale], () => compiledHeadShapes.ogLocale(ogLocale))
  })

  // SSR-only default description so page-level descriptions are not overridden
  // during hydration by client-side defaults. The siteConfig plugin also registers
  // a low-priority client-side fallback. Without compiler mode it is a `useSeoMeta` call,
  // and modules such as og-image read it as one.
  if (import.meta.server && siteConfig.description) {
    pushChosenHead(nuxtApp, head, () => {
      const description = toValue(siteConfig.description)
      return chooseShape(shapes?.description, [description], () => compiledHeadShapes.description(description))
    }, undefined, { seoMeta: true })
  }
  const siteName = siteConfig.name
  if (siteConfig.twitter) {
    // id must have the @ in it
    const twitter = toValue(siteConfig.twitter) as string
    const id = twitter.startsWith('@') ? twitter : `@${twitter}`
    pushChosenHead(nuxtApp, head, () => {
      const name = toValue(siteName)
      return chooseShape(prioritized?.siteMetaTwitter, [name, id], () => compiledHeadShapes.siteMetaTwitter(name, id, tagPriority))
    })
  }
  else {
    pushChosenHead(nuxtApp, head, () => {
      const name = toValue(siteName)
      return chooseShape(prioritized?.siteMeta, [name], () => compiledHeadShapes.siteMeta(name, tagPriority))
    })
  }
  // The derived tags plugin replaces this content with the resolved canonical href,
  // so a page-level canonical also moves og:url. On the server it sets the content here.
  const ogUrlChoice = (href: string | false) => chooseShape(prioritized?.ogUrl, [href], () => compiledHeadShapes.ogUrl(href, tagPriority))
  const replaceOgUrl = pushChosenHead(nuxtApp, head, () => ogUrlChoice(canonicalHref.value))
  if (import.meta.server && replaceOgUrl)
    provideOgUrlSetter(head, content => replaceOgUrl(ogUrlChoice(content)))
}
