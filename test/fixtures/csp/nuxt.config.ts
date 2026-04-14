import NuxtSeoUtils from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSeoUtils,
    'nuxt-security',
  ],

  site: {
    name: 'CSP Fixture',
    url: 'https://example.com',
  },

  app: {
    head: {
      script: [
        { innerHTML: 'var   cspInlineScript   =   true  ;  // inline script that must hash correctly' },
      ],
      style: [
        { innerHTML: '.csp-inline  {  color:  red;  /* block comment */  display:  flex  }' },
      ],
    },
  },

  // @ts-expect-error seoUtils module config key is `seo`
  seo: {
    minify: { build: true, runtime: true },
    treeShakeUseSeoMeta: false,
  },

  security: {
    headers: {
      contentSecurityPolicy: {
        'script-src': ['\'self\''],
        'style-src': ['\'self\''],
      },
    },
    ssg: {
      meta: true,
      hashScripts: true,
      hashStyles: true,
    },
  },

  nitro: {
    prerender: {
      crawlLinks: false,
      routes: ['/'],
      failOnError: false,
    },
  },

  compatibilityDate: '2024-08-07',
})
