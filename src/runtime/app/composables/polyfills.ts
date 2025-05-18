import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'
import { computed, toValue } from 'vue'

export function useSchemaOrg() {}
export function defineWebSite() {}
export function defineWebPage() {}
export function defineBreadcrumb() {}

export function useI18n() {
  const siteConfig = useSiteConfig({
    resolveRefs: false,
  })
  return {
    // eslint-disable-next-line unused-imports/no-unused-vars
    t: (_: string, fallback: string, options: any) => fallback,
    te: (_: string) => false,
    strategy: 'no_prefix',
    defaultLocale: computed(() => {
      return toValue(siteConfig.defaultLocale) || 'en'
    }),
    locale: computed(() => {
      return toValue(siteConfig.currentLocale) || toValue(siteConfig.defaultLocale) || 'en'
    }),
  }
}
