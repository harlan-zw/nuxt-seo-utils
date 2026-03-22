import type { ComputedRef } from 'vue'
import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'
import { computed, toValue } from 'vue'

// eslint-disable-next-line harlanzw/vue-no-faux-composables
export function useSchemaOrg(): void {}
export function defineWebSite(): void {}
export function defineWebPage(): void {}
export function defineBreadcrumb(): void {}

export function useI18n(): {
  t: (_: string, fallback: string, _options: any) => string
  te: (_: string) => boolean
  strategy: string
  defaultLocale: ComputedRef<string>
  locale: ComputedRef<string>
} {
  const siteConfig = useSiteConfig({
    resolveRefs: false,
  })
  return {
    t: (_: string, fallback: string, _options: any) => fallback,
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
