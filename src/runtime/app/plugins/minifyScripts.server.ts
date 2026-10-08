import { defineNuxtPlugin, injectHead } from 'nuxt/app'
import { JSON_TYPES, minifyCSS, minifyJSON } from '../../shared/minify'

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
                catch {
                  // Invalid JSON should not block SSR; keep the original script content.
                }
                continue
              }
              // Dynamic JavaScript and custom script types need a parser. Preserve them at runtime.
            }
            else if (tag.tag === 'style') {
              try {
                const minified = minifyCSS(content)
                if (minified.length < content.length)
                  tag.innerHTML = minified
              }
              catch {
                // Inline style minification is best-effort; preserve the original content on failure.
              }
            }
          }
        },
      },
    })
  },
})
