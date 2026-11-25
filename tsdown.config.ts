import { builder } from '@nuxt/module-builder/tsdown'
import { defineConfig } from 'tsdown'

export default defineConfig({
  plugins: [
    builder({
      entries: [
        { input: 'src/cli', name: 'cli' },
      ],
      externals: [
        'sharp',
        '@nuxt/kit',
        'citty',
        'consola/utils',
        'pathe',
        'ufo',
        'nuxt/server',
        'unhead',
        '@unhead/vue',
        '@unhead/vue/plugins',
        '@unhead/vue/utils',
        '@unhead/vue/vite',
      ],
    }),
  ],
})
