import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
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
  ],
})
