import { defineNuxtPlugin } from 'nuxt/app'

// Register the fallback before route and page head entries.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.ssrContext?.head.push({ meta: [{ property: 'og:type', content: 'website' }] })
})
