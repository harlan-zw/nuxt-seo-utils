import { defineNuxtPlugin } from 'nuxt/app'
import { applyDefaults } from '../logic/applyDefaults'

export default defineNuxtPlugin({
  name: 'nuxt-seo:defaults',
  env: {
    islands: false,
  },
  // we need to wait for the i18n plugin to run first
  dependsOn: ['nuxt-site-config:i18n'],
  setup() {
    applyDefaults()
  },
})
