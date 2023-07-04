import type { Nuxt } from '@nuxt/schema'
import { unpackMeta } from 'unhead'
import { useNuxt } from '@nuxt/kit'

export default function extendNuxtConfigAppHeadSeoMeta(nuxt: Nuxt = useNuxt()) {
  // from the root public let's find which ones we can infer SEO meta and link tags from, following the Next.js convention
  // outlined in this site: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons
  const seoMeta = nuxt.options.app?.seoMeta || false
  if (!seoMeta)
    return
  nuxt.options.app.head = nuxt.options.app.head || {}
  nuxt.options.app.head = {
    ...nuxt.options.app.head,
    meta: [
      ...nuxt.options.app.head.meta || [],
      ...unpackMeta(seoMeta),
    ],
  }
  return nuxt.options.app.head
}
