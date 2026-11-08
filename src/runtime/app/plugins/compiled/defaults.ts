import { defineNuxtPlugin } from 'nuxt/app'
import { applyCompiledDefaults } from '../../logic/applyCompiledDefaults'

export default defineNuxtPlugin({
  name: 'nuxt-seo:defaults',
  order: 999,
  env: {
    islands: false,
  },
  setup() {
    applyCompiledDefaults()
  },
})
