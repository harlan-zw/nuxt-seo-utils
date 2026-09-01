import { injectHead } from '@unhead/vue'
import { InferSeoMetaPlugin, TemplateParamsPlugin } from '@unhead/vue/plugins'
import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'

// unhead v3 skips the twitter:card push for `twitterCard: false`, but v2 ignores
// the option and falls back to `summary_large_image`. Both majors render the option
// value verbatim, so we push a sentinel card and strip it before resolve. The strip
// only matches the sentinel, user-set twitter:card tags always survive.
const disabledTwitterCard = 'x-nuxt-seo-utils-disabled-twitter-card'

export default defineNuxtPlugin(() => {
  const head = injectHead()

  // something quite wrong
  if (!head)
    return

  const { automaticTwitterTags } = useRuntimeConfig().public['seo-utils'] as { automaticTwitterTags?: boolean }

  head.use(TemplateParamsPlugin)

  if (automaticTwitterTags === false) {
    // the option is typed as a card preset, but every major renders the value verbatim
    head.use(InferSeoMetaPlugin({ twitterCard: disabledTwitterCard as 'summary_large_image' }))
    head.use({
      key: 'nuxt-seo-utils:twitter-card-suppression',
      hooks: {
        'tags:beforeResolve': ({ tags }) => {
          for (let i = tags.length - 1; i >= 0; i--) {
            const tag = tags[i]!
            if (tag.tag === 'meta' && tag.props.name === 'twitter:card' && tag.props.content === disabledTwitterCard)
              tags.splice(i, 1)
          }
        },
      },
    })
  }
  else {
    head.use(InferSeoMetaPlugin())
  }
})
