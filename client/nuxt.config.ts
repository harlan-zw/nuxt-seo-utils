import { resolve } from 'pathe'

export default defineNuxtConfig({
  extends: ['nuxtseo-shared/layer-devtools'],

  nitro: {
    prerender: {
      routes: [
        '/',
        '/social',
      ],
    },
    output: {
      publicDir: resolve(__dirname, '../dist/client'),
    },
  },

  app: {
    baseURL: '/__nuxt-seo-utils',
  },
})
