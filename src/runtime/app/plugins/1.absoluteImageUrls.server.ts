import { defineNuxtPlugin, injectHead } from 'nuxt/app'
import { unref } from 'vue'
import { createSitePathResolver } from '#site-config/app/composables/utils'

// Link preview crawlers only follow absolute URLs in these tags.
const ABSOLUTE_URL_PROPERTIES = new Set([
  'og:image',
  'og:image:url',
  'og:image:secure_url',
  'og:video',
  'og:video:url',
  'og:video:secure_url',
  'og:audio',
  'og:audio:url',
  'og:audio:secure_url',
])
const ABSOLUTE_URL_NAMES = new Set(['twitter:image', 'twitter:image:src'])

export default defineNuxtPlugin({
  enforce: 'post',
  setup() {
    const head = injectHead()
    // something quite wrong
    if (!head)
      return

    const resolver = createSitePathResolver({
      withBase: true,
      absolute: true,
      canonical: true,
    })
    head.use({
      key: 'absoluteImageUrls',
      hooks: {
        'tags:resolve': ({ tags }) => {
          // iterate through tags that require absolute URLs and add the host base
          for (const tag of tags) {
            if (tag.tag !== 'meta')
              continue
            if (!ABSOLUTE_URL_PROPERTIES.has(tag.props.property) && !ABSOLUTE_URL_NAMES.has(tag.props.name))
              continue
            if (typeof tag.props.content !== 'string' || !tag.props.content.trim() || tag.props.content.startsWith('http') || tag.props.content.startsWith('//'))
              continue
            tag.props.content = unref(resolver(tag.props.content))
          }
        },
      },
    })
  },
})
