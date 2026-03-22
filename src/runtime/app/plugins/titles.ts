import type { UseHeadOptions } from '@unhead/vue/types'
import { useHead } from '#imports'
import { defineNuxtPlugin } from 'nuxt/app'
import { useFallbackTitle } from '../composables/useFallbackTitle'

export default defineNuxtPlugin({
  name: 'nuxt-seo:fallback-titles',
  env: {
    islands: false,
  },
  setup() {
    const title = useFallbackTitle()

    const minimalPriority: UseHeadOptions = {
      // give nuxt.config values higher priority
      tagPriority: 101,
    }

    useHead({ title: () => title.value }, minimalPriority)
  },
})
