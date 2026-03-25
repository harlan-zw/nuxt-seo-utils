import { injectHead } from '@unhead/vue'
import { defineNuxtPlugin } from 'nuxt/app'
import { minifyCSS, minifyJS, minifyJSON } from '../../shared/minify'

const JSON_TYPES = new Set(['application/json', 'application/ld+json'])
const SKIP_JS_TYPES = new Set(['application/json', 'application/ld+json', 'speculationrules', 'importmap'])

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
            if (!content)
              continue

            if (tag.tag === 'script') {
              const type = tag.props.type
              if (type && JSON_TYPES.has(type)) {
                try {
                  const minified = minifyJSON(content)
                  if (minified.length < content.length)
                    tag.innerHTML = minified
                }
                catch {}
                continue
              }
              if (type && SKIP_JS_TYPES.has(type))
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
