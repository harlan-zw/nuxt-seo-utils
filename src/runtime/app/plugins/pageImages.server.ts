import type { UseSeoMetaInput } from '@unhead/vue/types'
import { defineNuxtPlugin, useRequestEvent, useSeoMeta } from 'nuxt/app'

export default defineNuxtPlugin((nuxtApp) => {
  if (nuxtApp.payload?.error)
    return
  // Keep file fallbacks outside the shared route-rule payload. Register before
  // authored route rules and page setup so either can override these images.
  const rules = useRequestEvent()?.context._nitro?.routeRules as Record<string, unknown> | undefined
  const images = rules?._seoUtilsPageImages as UseSeoMetaInput | undefined
  if (images)
    useSeoMeta(images)
})
