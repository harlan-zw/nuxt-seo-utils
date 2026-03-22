import { resolve } from 'pathe'

export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@nuxt/fonts',
    '@nuxt/ui',
  ],

  css: ['~/assets/css/global.css'],

  fonts: {
    families: [
      { name: 'Hubot Sans' },
    ],
  },

  devtools: {
    enabled: false,
  },

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

  compatibilityDate: '2024-09-11',
})
