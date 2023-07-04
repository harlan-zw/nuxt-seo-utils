import { injectHead } from '@unhead/vue'
import { createSitePathResolver, defineNuxtPlugin, unref } from '#imports'

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
      canonical: false,
    })
    head.use({
      hooks: {
        'tags:resolve': async ({ tags }) => {
          // iterate through tags that require absolute URLs and add the host base
          for (const tag of tags) {
            // og:image and twitter:image need to be absolute
            if (tag.tag !== 'meta')
              continue
            if (tag.props.property !== 'og:image:url' && tag.props.property !== 'og:image' && tag.props.name !== 'twitter:image')
              continue
            if (!tag.props.content || tag.props.content.startsWith('http') || tag.props.content.startsWith('//'))
              continue
            tag.props.content = unref(resolver(tag.props.content))
          }
        },
      },
    })
  },
})
