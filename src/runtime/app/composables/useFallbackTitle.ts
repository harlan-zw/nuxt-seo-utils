import { useError, useNuxtApp, useRoute } from 'nuxt/app'
import { titleCase } from 'scule'
import { withoutTrailingSlash } from 'ufo'
import { computed } from 'vue'
import { useI18n } from '#imports'

interface I18nTranslator {
  t: (key: string, fallback: string, options?: Record<string, unknown>) => string
}

export function useFallbackTitle() {
  const route = useRoute()
  const err = useError()
  let i18n: I18nTranslator | undefined
  try {
    // vue-i18n's `useI18n()` throws outside of a component setup, and this composable is
    // called from a plugin, so resolve the translator from the Nuxt app instead.
    i18n = (useNuxtApp() as unknown as { $i18n?: I18nTranslator }).$i18n
  }
  catch {
    // useNuxtApp() needs a Nuxt context (plugin or component setup); try the fallback below.
  }
  if (!i18n) {
    try {
      // installs without i18n register a polyfill translator that always returns the fallback,
      // so this only fails when i18n is installed but its instance cannot be resolved.
      i18n = useI18n()
    }
    catch {
      console.warn('[nuxt-seo-utils] useFallbackTitle: could not resolve the i18n instance. Titles will not be resolved from i18n messages.')
    }
  }
  return computed(() => {
    if (err.value?.statusCode && [404, 500].includes(err.value.statusCode)) {
      return `${err.value.statusCode} - ${err.value.message}`
    }
    if (typeof route.meta?.title === 'string')
      return route.meta?.title
    // if no title has been set then we should use the last segment of the URL path and title case it
    const path = withoutTrailingSlash(route.path || '/')
    const lastSegment = path.split('/').pop()
    let fallback = lastSegment ? titleCase(lastSegment) : null
    // try to resolve the title from i18n translations using the route name
    const matched = route.matched?.at(-1)
    if (matched) {
      const routeName = String(matched.name).split('___')?.[0]
      if (routeName && i18n)
        fallback = i18n.t(`pages.${routeName}.title`, fallback || '', { missingWarn: false }) || fallback
    }
    return fallback
  })
}
