import { defineNuxtPlugin } from 'nuxt/app'
import { applyDefaults } from '../logic/applyDefaults'

export default defineNuxtPlugin({
  name: 'nuxt-seo:defaults',
  order: 999,
  env: {
    islands: false,
  },
  setup() {
    applyDefaults()
  },
})
