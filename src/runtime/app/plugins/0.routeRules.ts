import type { SerializableHead, UseSeoMetaInput } from '@unhead/vue/types'
import { defineNuxtPlugin, useHead, useRequestEvent, useRuntimeConfig, useSeoMeta, useState } from '#imports'

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
    const { tagPriority } = useRuntimeConfig().public['seo-utils'] as { tagPriority: number | 'critical' | 'high' | 'low' | `before:${string}` | `after:${string}` | undefined }
    const routeRuleState = useState<RouteRuleState | null>('nuxt-seo-utils:routeRules', () => null)
    if (import.meta.server) {
      const event = useRequestEvent()
      routeRuleState.value = parseRouteRuleState(event?.context as RouteRuleEventContext)
    }

    if (routeRuleState.value) {
      const { head: headInput, seoMeta } = routeRuleState.value
      if (headInput)
        useHead(headInput)
      if (seoMeta)
        useSeoMeta(seoMeta, { tagPriority })
    }
  },
})
