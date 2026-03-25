import antfu from '@antfu/eslint-config'
import harlanzw from 'eslint-plugin-harlanzw'

export default antfu(
  {
    ignores: [
      'CLAUDE.md',
      '.claude/**',
      'test/fixtures/**',
      'playground/**',
      '**/*.md',
    ],
  },
  ...harlanzw({ link: true, nuxt: true, vue: true }),
  {
    files: ['examples/**/package.json'],
    rules: {
      'pnpm/json-enforce-catalog': 'off',
      'pnpm/json-valid-catalog': 'off',
      'pnpm/json-prefer-workspace-settings': 'off',
    },
  },
)
