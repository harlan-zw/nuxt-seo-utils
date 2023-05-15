import type { Nuxt } from '@nuxt/schema'
import { hasLinkRel, hasMetaProperty } from '../util'

export default function moreDefaultTags(nuxt: Nuxt) {
  // from the root public let's find which ones we can infer SEO meta and link tags from, following the Next.js convention
  // outlined in this site: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons
  const headConfig = nuxt.options.app.head
  headConfig.link = headConfig.link || []
  headConfig.htmlAttrs = headConfig.htmlAttrs || {}
  headConfig.link = headConfig.link || []
  headConfig.meta = headConfig.meta || []

  // based on Yoast
  if (!hasLinkRel(headConfig, 'profile')) {
    headConfig.link.push({
      rel: 'profile',
      href: 'https://gmpg.org/xfn/11',
    })
  }

  if (!hasMetaProperty(headConfig, 'og:type')) {
    headConfig.meta.push({
      property: 'og:type',
      content: 'website',
    })
  }

  // if no lang has been set on htmlAttrs we default to `en`
  if (!headConfig.htmlAttrs.lang)
    headConfig.htmlAttrs.lang = 'en'
  nuxt.options.app.head = headConfig
}
