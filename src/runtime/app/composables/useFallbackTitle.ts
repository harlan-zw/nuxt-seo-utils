import type { I18nTranslator } from '../../shared/i18n'
import { useError, useNuxtApp, useRoute } from 'nuxt/app'
import { titleCase } from 'scule'
import { withoutTrailingSlash } from 'ufo'
import { computed } from 'vue'
import { resolveI18nMessage } from '../../shared/i18n'

export function resolveErrorFallbackTitle(error: { statusCode?: number, message?: string } | null | undefined): string | null {
  if (error?.statusCode && [404, 500].includes(error.statusCode))
    return `${error.statusCode} - ${error.message}`
  return null
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
    // useNuxtApp() needs a Nuxt context (plugin or component setup).
  }
  return computed(() => {
    const errorTitle = resolveErrorFallbackTitle(err.value)
    if (errorTitle) {
      return errorTitle
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
      if (routeName)
        fallback = resolveI18nMessage(i18n, `pages.${routeName}.title`) ?? fallback
    }
    return fallback
  })
}
