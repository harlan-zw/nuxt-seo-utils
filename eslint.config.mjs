import antfu from '@antfu/eslint-config'
import harlanzw from 'eslint-plugin-harlanzw'

export default antfu(
  {},
  ...harlanzw({
    // markdown here is docs content, handled by `lint:docs`
    base: { ignores: ['**/*.md'] },
    link: true,
    nuxt: true,
    vue: true,
  }),
  {
    // On Nuxt 4.6 with Nitro 2, these helpers run through Nuxt's core server module, which
    // imports app.config. That breaks `compatibilityVersion: 5` servers whose app.config calls
    // `defineAppConfig`.
    files: ['src/runtime/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'nuxt/server',
          importNames: ['getRequestHost', 'getRequestProtocol', 'getRequestURL', 'getRouterParam', 'getRouterParams', 'useAppConfig', 'getSession', 'useSession', 'updateSession', 'clearSession', 'getValidatedQuery', 'readValidatedBody'],
          message: 'It pulls app.config into the Nitro 2 server bundle. Read the request headers or `event.url` instead.',
        }],
      }],
    },
  },
)
