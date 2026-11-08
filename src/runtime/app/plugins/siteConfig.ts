import type { SiteConfigHeadOptions } from '../logic/siteConfigHeadInput'
import { defineNuxtPlugin, injectHead, useRuntimeConfig } from 'nuxt/app'
import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'
import { siteConfigHeadInput } from '../logic/siteConfigHeadInput'

export default defineNuxtPlugin(() => {
  const head = injectHead()
  // something quite wrong
  if (!head)
    return

  const options = useRuntimeConfig().public['seo-utils'] as SiteConfigHeadOptions
  head.push(siteConfigHeadInput(useSiteConfig(), options))
})
