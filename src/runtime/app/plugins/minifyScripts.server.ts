import { injectHead } from '#imports'
import { defineNuxtPlugin } from 'nuxt/app'
import { minifyJS } from '../../shared/minifyJS'

const NON_JS_TYPES = new Set(['application/json', 'application/ld+json', 'speculationrules', 'importmap'])

export default defineNuxtPlugin({
  enforce: 'post',
  setup() {
    const head = injectHead()
    if (!head)
      return

    head.use({
      key: 'minify-scripts',
      hooks: {
        'ssr:render': ({ tags }) => {
          for (const tag of tags) {
            if (tag.tag !== 'script')
              continue
            if (tag.props.type && NON_JS_TYPES.has(tag.props.type))
              continue
            const content = tag.innerHTML
            if (!content || content.trim().length < 20)
              continue
            try {
              const minified = minifyJS(content)
              if (minified.length < content.length)
                tag.innerHTML = minified
            }
            catch {}
          }
        },
      },
    })
  },
})
