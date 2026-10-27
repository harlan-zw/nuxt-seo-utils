import NuxtSeoUtils from '../../../dist/module.mjs'

export default defineNuxtConfig({
  workspaceDir: import.meta.dirname,
  modules: [NuxtSeoUtils],
  seo: { debug: true },
  runtimeConfig: {
    public: {
      apiBase: '/api',
      retryLimit: 3,
      nested: { enabled: true },
    },
  },
  app: {
    seoMeta: { description: 'App description' },
    head: { seoMeta: { ogTitle: 'Head title' } },
  },
})
