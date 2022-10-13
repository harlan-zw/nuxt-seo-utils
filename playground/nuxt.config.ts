import { resolve } from 'pathe'

export default defineNuxtConfig({
  alias: {
    'nuxt-hedge': resolve(__dirname, '../src/module'),
  },
  modules: [
    'nuxt-hedge',
  ],
  app: {
    head: {
      link: [
        {
          href: '/',
        },
      ],
      viewport: 'width=device-width, initial-scale=1',
    },
  },
  workspaceDir: resolve(__dirname, '../'),
  imports: {
    autoImport: true,
  },
})
