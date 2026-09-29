import type { SerializableHead, UseSeoMetaInput } from '@unhead/vue/types'
import { defineNuxtPlugin, useHead, useRequestEvent, useSeoMeta, useState } from '#imports'

interface RouteRuleState {
  head?: SerializableHead
  seoMeta?: UseSeoMetaInput
}

interface RouteRuleEventContext {
  _nitro?: {
    routeRules?: Record<string, unknown>
  }
}

function parseRouteRuleState(context: RouteRuleEventContext): RouteRuleState {
  // Nuxt's app manifest omits module-specific route rule fields. Nitro keeps the
  // complete matched rule on the request context.
  const rules = context._nitro?.routeRules
  return {
    head: rules?.head as SerializableHead | undefined,
    seoMeta: rules?.seoMeta as UseSeoMetaInput | undefined,
  }
}

export default defineNuxtPlugin({
  enforce: 'post',
  env: { islands: false },
  setup() {
    const routeRuleState = useState<RouteRuleState | null>('nuxt-seo-utils:routeRules', () => null)
    if (import.meta.server) {
      const event = useRequestEvent()
      routeRuleState.value = parseRouteRuleState(event?.context as RouteRuleEventContext)
    }

    // Route rules are user config scoped to a route, so they render at normal priority.
    // They register after app.head and before page setup: they beat app.head and
    // seo.meta, and a page useSeoMeta() or useHead() call beats them.
    if (routeRuleState.value) {
      const { head: headInput, seoMeta } = routeRuleState.value
      if (headInput)
        useHead(headInput)
      if (seoMeta)
        useSeoMeta(seoMeta)
    }
  },
})
