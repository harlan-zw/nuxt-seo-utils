import { resolve } from 'pathe'

export default defineNuxtConfig({
  alias: {
    'nuxt-hedge': resolve(__dirname, '../src/module'),
  },
  hooks: {
    'modules:before': async ({ nuxt }) => {
      // swap out the nuxt internal module for nuxt-hedge
      for (const k in nuxt.options._modules) {
        if (typeof nuxt.options._modules[k] === 'function' && (await nuxt.options._modules[k].getMeta()).name === 'meta')
          nuxt.options._modules[k] = 'nuxt-hedge'
      }
    },
  },
  workspaceDir: resolve(__dirname, '../'),
  imports: {
    autoImport: true,
  },
})
