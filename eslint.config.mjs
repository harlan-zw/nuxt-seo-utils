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
)
