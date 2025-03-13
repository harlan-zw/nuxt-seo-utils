import { injectHead, useSeoMeta } from '#imports'
import { defineNuxtPlugin, getRouteRules, useRequestEvent, useState } from 'nuxt/app'

export default defineNuxtPlugin({
  enforce: 'post',
  async setup() {
    const head = injectHead()
    const routeRuleState = useState<{ head: any, seoMeta: any } | null>('nuxt-seo-utils:routeRules', () => null)
    if (import.meta.server) {
      const event = useRequestEvent()
      const routeRules = await getRouteRules(event!)
      routeRuleState.value = {
        head: routeRules.head,
        seoMeta: routeRules.seoMeta,
      }
    }

    if (routeRuleState.value) {
      const { head: headInput, seoMeta } = routeRuleState.value
      if (headInput)
        head.push(headInput)
      if (seoMeta)
        useSeoMeta(seoMeta)
    }
  },
})
