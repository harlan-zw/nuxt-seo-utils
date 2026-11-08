import type { SiteConfigHeadOptions } from '../../logic/siteConfigHeadInput'
import { VueResolver, walkResolver } from '@unhead/vue/utils'
import { defineNuxtPlugin, injectHead, useRuntimeConfig } from 'nuxt/app'
import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'
import { chooseSiteHead, useSiteHeadPayload } from '../../logic/applyCompiledDefaults'
import { pushChosenHead } from '../../logic/compiledHead'
import { siteConfigHeadInput } from '../../logic/siteConfigHeadInput'

// The site config plugin under compiler mode: the same input, as compiled tags.
export default defineNuxtPlugin((nuxtApp) => {
  const head = injectHead()
  // something quite wrong
  if (!head)
    return

  const options = useRuntimeConfig().public['seo-utils'] as SiteConfigHeadOptions
  // Built once, as the normal plugin does. Only the site config object inside stays reactive.
  const input = siteConfigHeadInput(useSiteConfig(), options)
  const payload = useSiteHeadPayload()
  pushChosenHead(nuxtApp, head as any, () => chooseSiteHead(payload.value, 'siteConfig', walkResolver(input, VueResolver) as object))
})
