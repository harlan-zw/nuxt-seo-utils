import antfu from '@antfu/eslint-config'
import harlanzw from 'eslint-plugin-harlanzw'

export default antfu(
  {
    type: 'lib',
    markdown: false,
    ignores: [
      'CLAUDE.md',
      '.claude/**',
      'test/fixtures/**',
      'playground/**',
    ],
  },
  ...harlanzw({ link: true, nuxt: true, vue: true }),
)
