import { injectHead } from '@unhead/vue'
import { defineNuxtPlugin, useRequestEvent } from '#app'
import { getRequestHost, getRequestProtocol } from 'h3'
import { withBase } from 'ufo'

export default defineNuxtPlugin(() => {
  const head = injectHead()
  // something quite wrong
  if (!head)
    return

  const event = useRequestEvent()
  const hostname = getRequestHost(event)
  const protocol = getRequestProtocol(event)

  head.use({
    hooks: {
      'tags:resolve': ({ tags }) => {
        // iterate through tags that require absolute URLs and add the host base
        for (const tag of tags) {
          // og:image and twitter:image need to be absolute
          if (tag.tag !== 'meta')
            continue
          if (tag.props.property !== 'og:image' && tag.props.name !== 'twitter:image')
            continue
          if (!tag.props.content || tag.props.content.startsWith('http'))
            continue
          tag.props.content = withBase(tag.props.content, `${protocol}://${hostname}`)
        }
      },
    },
  })
})
