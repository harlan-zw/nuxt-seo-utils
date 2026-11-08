import { defineNuxtPlugin } from 'nuxt/app'
import { applyCompiledFallbackTitle } from '../../logic/applyCompiledFallbackTitle'

export default defineNuxtPlugin({
  name: 'nuxt-seo:fallback-titles',
  env: {
    islands: false,
  },
  // we need to wait for the i18n plugin to run first
  dependsOn: ['nuxt-site-config:i18n'],
  setup() {
    applyCompiledFallbackTitle()
  },
})
