import type { UseHeadOptions } from '@unhead/vue/types'
import { useHead, useI18n } from '#imports'
import { defineNuxtPlugin, useError, useRoute, useRouter } from 'nuxt/app'
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
    const router = useRouter()
    const err = useError()
    const i18n = useI18n()
    const title = computed(() => {
      if (err.value && [404, 500].includes(err.value?.statusCode)) {
        return `${err.value.statusCode} - ${err.value.message}`
      }
      if (typeof route.meta?.title === 'string')
        return route.meta?.title
      // if no title has been set then we should use the last segment of the URL path and title case it
      const path = withoutTrailingSlash(route.path || '/')
      const lastSegment = path.split('/').pop()
      let fallback = lastSegment ? titleCase(lastSegment) : null
      // try to resolve the title from i18n translations using the route name
      const matched = router.resolve(route.path)?.matched?.at(-1)
      if (matched) {
        const routeName = String(matched.name).split('___')?.[0]
        if (routeName)
          fallback = i18n.t(`pages.${routeName}.title`, fallback || '', { missingWarn: false }) || fallback
      }
      return fallback
    })

    const minimalPriority: UseHeadOptions = {
      // give nuxt.config values higher priority
      tagPriority: 101,
    }

    useHead({ title: () => title.value }, minimalPriority)
  },
})
