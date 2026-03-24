import { injectHead } from '#imports'
import { defineNuxtPlugin } from 'nuxt/app'
import { minifyCSS, minifyJS } from '../../shared/minify'

const NON_JS_TYPES = new Set(['application/json', 'application/ld+json', 'speculationrules', 'importmap'])

export default defineNuxtPlugin({
  enforce: 'post',
  setup() {
    const head = injectHead()
    if (!head)
      return

    head.use({
      key: 'minify-inline',
      hooks: {
        'ssr:render': ({ tags }) => {
          for (const tag of tags) {
            const content = tag.innerHTML
            if (!content || content.trim().length < 20)
              continue

            if (tag.tag === 'script') {
              if (tag.props.type && NON_JS_TYPES.has(tag.props.type))
                continue
              try {
                const minified = minifyJS(content)
                if (minified.length < content.length)
                  tag.innerHTML = minified
              }
              catch {}
            }
            else if (tag.tag === 'style') {
              try {
                const minified = minifyCSS(content)
                if (minified.length < content.length)
                  tag.innerHTML = minified
              }
              catch {}
            }
          }
        },
      },
    })
  },
})
