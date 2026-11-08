import { defineNuxtPlugin } from 'nuxt/app'
import { applyCompiledFallbackTitle } from '../../logic/applyCompiledFallbackTitle'

export default defineNuxtPlugin({
  name: 'nuxt-seo:fallback-titles',
  env: {
    islands: false,
  },
  setup() {
    applyCompiledFallbackTitle()
  },
})
