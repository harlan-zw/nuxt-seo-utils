import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'
import { defineNuxtPlugin } from 'nuxt/app'
import { ref } from 'vue'
import { applyDefaults } from '../logic/applyDefaults'

export default defineNuxtPlugin({
  name: 'nuxt-seo:defaults',
  env: {
    islands: false,
  },
  // we need to wait for the i18n plugin to run first
  // @ts-expect-error dynamic
  dependsOn: ['nuxt-site-config:i18n'],
  setup(nuxtApp) {
    const siteConfig = useSiteConfig()
    // @ts-expect-error untyped
    const locale = ref(nuxtApp.$i18n?.locale?.value || siteConfig.currentLocale || siteConfig.defaultLocale)
    nuxtApp.hook('i18n:localeSwitched', ({ newLocale }) => {
      locale.value = newLocale
    })
    applyDefaults({ locale })
  },
})
