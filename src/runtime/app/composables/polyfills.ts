import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'
import { ref } from 'vue'

export function useSchemaOrg() {}
export function defineWebSite() {}
export function defineWebPage() {}
export function defineBreadcrumb() {}

export function useI18n() {
  const siteConfig = useSiteConfig()
  return {
    // eslint-disable-next-line unused-imports/no-unused-vars
    t: (_: string, fallback: string, options: any) => fallback,
    te: (_: string) => false,
    strategy: 'no_prefix',
    defaultLocale: ref(siteConfig.defaultLocale || 'en'),
    locale: ref(siteConfig.currentLocale || siteConfig.defaultLocale || 'en'),
  }
}
