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
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1',
      charset: 'utf-8',
      // @todo support aliasing
      // link: [
      //   { rel: 'stylesheet', href: '~/assets/my-css-file.scss' },
      // ],
    },
  },
  workspaceDir: resolve(__dirname, '../'),
  imports: {
    autoImport: true,
  },
})
