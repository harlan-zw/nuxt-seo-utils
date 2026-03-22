import { injectHead, useSeoMeta } from '#imports'
import { defineNuxtPlugin, getRouteRules, useRequestEvent, useRuntimeConfig, useState } from 'nuxt/app'

export default defineNuxtPlugin({
  enforce: 'post',
  env: { islands: false },
  async setup() {
    const head = injectHead()
    if (!head)
      return
    const { tagPriority } = useRuntimeConfig().public['seo-utils'] as { tagPriority: number | undefined }
    const routeRuleState = useState<{ head: any, seoMeta: any } | null>('nuxt-seo-utils:routeRules', () => null)
    if (import.meta.server) {
      const event = useRequestEvent()
      const routeRules = await getRouteRules(event!)
      const rules = routeRules as Record<string, any>
      routeRuleState.value = {
        head: rules.head,
        seoMeta: rules.seoMeta,
      }
    }

    if (routeRuleState.value) {
      const { head: headInput, seoMeta } = routeRuleState.value
      if (headInput)
        head.push(headInput)
      if (seoMeta)
        useSeoMeta(seoMeta, { tagPriority })
    }
  },
})
