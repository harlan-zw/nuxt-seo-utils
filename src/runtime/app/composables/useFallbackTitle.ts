import { useError, useRoute } from 'nuxt/app'
import { titleCase } from 'scule'
import { withoutTrailingSlash } from 'ufo'
import { computed } from 'vue'

export function useFallbackTitle() {
  const route = useRoute()
  const err = useError()
  return computed(() => {
    if (err.value?.statusCode && [404, 500].includes(err.value.statusCode)) {
      return `${err.value.statusCode} - ${err.value.message}`
    }
    if (typeof route.meta?.title === 'string')
      return route.meta?.title
    // if no title has been set then we should use the last segment of the URL path and title case it
    const path = withoutTrailingSlash(route.path || '/')
    const lastSegment = path.split('/').pop()
    return lastSegment ? titleCase(lastSegment) : null
  })
}
