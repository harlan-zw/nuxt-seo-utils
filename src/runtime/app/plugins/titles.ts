import type { UseHeadOptions } from '@unhead/vue'
import { useHead } from '@unhead/vue'
import { defineNuxtPlugin, useRoute } from 'nuxt/app'
import { titleCase } from 'scule'
import { withoutTrailingSlash } from 'ufo'
import { computed } from 'vue'

export default defineNuxtPlugin({
  name: 'nuxt-seo:fallback-titles',
  env: {
    islands: false,
  },
  setup() {
    const route = useRoute()
    const err = useError()
    const title = computed(() => {
      if ([404, 500].includes(err.value?.statusCode)) {
        return `${err.value.statusCode} - ${err.value.message}`
      }
      if (typeof route.meta?.title === 'string')
        return route.meta?.title
      // if no title has been set then we should use the last segment of the URL path and title case it
      const path = withoutTrailingSlash(route.path || '/')
      const lastSegment = path.split('/').pop()
      return lastSegment ? titleCase(lastSegment) : null
    })

    const minimalPriority: UseHeadOptions = {
      // give nuxt.config values higher priority
      tagPriority: 101,
    }

    useHead({ title: () => title.value }, minimalPriority)
  },
})
