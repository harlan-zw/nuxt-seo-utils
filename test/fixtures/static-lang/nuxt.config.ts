import NuxtSeoUtils from '../../../src/module'

export default defineNuxtConfig({
  modules: [NuxtSeoUtils],

  site: {
    url: 'https://example.com',
    name: 'Test Static Lang',
  },

  // a non-english lang with no matching `site.defaultLocale`, the case validateAppHead exists for
  app: {
    head: {
      htmlAttrs: {
        lang: 'fr',
      },
    },
  },
})
