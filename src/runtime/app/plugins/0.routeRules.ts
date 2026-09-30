import type { SerializableHead, UseSeoMetaInput } from '@unhead/vue/types'
import { defineNuxtPlugin, useHead, useRequestEvent, useSeoMeta, useState } from 'nuxt/app'

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

    // Route rules have their own layer. Precedence, lowest first:
    // 1. module defaults, at the `tagPriority` option ('low' by default)
    // 2. app.head and seo.meta
    // 3. route rules
    // 4. page useHead() and useSeoMeta()
    // Layers 2 to 4 share the default weight. Unhead breaks the tie by entry order, and this
    // entry registers after app.head and before page setup. The `tagPriority` option does not
    // apply here, so raising it can never let a route rule beat the page.
    if (routeRuleState.value) {
      const { head: headInput, seoMeta } = routeRuleState.value
      if (headInput)
        useHead(headInput)
      if (seoMeta)
        useSeoMeta(seoMeta)
    }
  },
})
