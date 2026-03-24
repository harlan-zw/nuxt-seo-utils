import { resolve } from 'pathe'

export default defineNuxtConfig({
  extends: ['nuxtseo-layer-devtools'],

  imports: {
    autoImport: true,
  },

  nitro: {
    prerender: {
      routes: ['/', '/social'],
    },
    output: {
      publicDir: resolve(__dirname, '../dist/devtools'),
    },
  },

  app: {
    baseURL: '/__nuxt-seo-utils',
  },
})
