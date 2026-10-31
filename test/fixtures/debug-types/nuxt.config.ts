import NuxtSeoUtils from '../../../src/module'

export default defineNuxtConfig({
  workspaceDir: import.meta.dirname,
  modules: [NuxtSeoUtils],
  runtimeConfig: {
    public: { apiBase: '/api', retryLimit: 3, nested: { enabled: true } },
  },
})
