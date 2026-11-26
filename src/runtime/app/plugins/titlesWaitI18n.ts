import type { UseHeadOptions } from '@unhead/vue/types'
import { defineNuxtPlugin, useError, useHead } from 'nuxt/app'
import { resolveErrorFallbackTitle, useFallbackTitle } from '../composables/useFallbackTitle'

export default defineNuxtPlugin({
  name: 'nuxt-seo:fallback-titles',
  env: {
    islands: false,
  },
  // we need to wait for the i18n plugin to run first
  dependsOn: ['nuxt-site-config:i18n'],
  setup() {
    const minimalPriority: UseHeadOptions = {
      // give nuxt.config values higher priority
      tagPriority: 101,
    }
    const err = useError()
    if (import.meta.server && err.value) {
      const errorTitle = resolveErrorFallbackTitle(err.value)
      if (errorTitle)
        useHead({ title: errorTitle }, minimalPriority)
      return
    }

    const title = useFallbackTitle()
    useHead({ title: () => title.value }, minimalPriority)
  },
})
