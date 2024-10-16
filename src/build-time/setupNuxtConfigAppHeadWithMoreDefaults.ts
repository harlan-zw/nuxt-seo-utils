import type { Nuxt } from '@nuxt/schema'
import { useNuxt } from '@nuxt/kit'
import { hasMetaProperty } from '../util'

export default function setupNuxtConfigAppHeadWithMoreDefaults(nuxt: Nuxt = useNuxt()) {
  // from the root public let's find which ones we can infer SEO meta and link tags from, following the Next.js convention
  // outlined in this site: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons
  const headConfig = nuxt.options.app.head
  headConfig.link = headConfig.link || []
  headConfig.htmlAttrs = headConfig.htmlAttrs || {}
  headConfig.link = headConfig.link || []
  headConfig.meta = headConfig.meta || []

  if (!hasMetaProperty(headConfig, 'og:type')) {
    headConfig.meta.push({
      property: 'og:type',
      content: 'website',
    })
  }

  nuxt.options.app.head = headConfig
}
