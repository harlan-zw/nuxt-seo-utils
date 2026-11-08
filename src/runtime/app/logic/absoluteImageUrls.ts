import type { HeadPlugin } from 'unhead/types'

export const ABSOLUTE_IMAGE_URLS_PLUGIN_KEY = 'absoluteImageUrls'

interface MetaProps {
  property?: unknown
  name?: unknown
  content?: unknown
}

/**
 * Whether a meta tag is an `og:image` or `twitter:image` with a relative URL, which crawlers cannot load.
 */
export function needsAbsoluteImageUrl(tag: string, props: MetaProps): props is MetaProps & { content: string } {
  if (tag !== 'meta')
    return false
  if (props.property !== 'og:image:url' && props.property !== 'og:image' && props.name !== 'twitter:image' && props.name !== 'twitter:image:src')
    return false
  return typeof props.content === 'string' && !!props.content.trim() && !props.content.startsWith('http') && !props.content.startsWith('//')
}

export function createAbsoluteImageUrlsPlugin(resolve: (path: string) => string): HeadPlugin {
  return {
    key: ABSOLUTE_IMAGE_URLS_PLUGIN_KEY,
    hooks: {
      'tags:resolve': ({ tags }) => {
        // og:image and twitter:image need to be absolute
        for (const tag of tags) {
          if (needsAbsoluteImageUrl(tag.tag, tag.props))
            tag.props.content = resolve(tag.props.content)
        }
      },
    },
  }
}
