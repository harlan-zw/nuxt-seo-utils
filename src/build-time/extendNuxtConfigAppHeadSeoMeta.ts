import type { Nuxt } from '@nuxt/schema'
import type { UseHeadInput } from 'unhead'
import { useNuxt } from '@nuxt/kit'
import { unpackMeta } from '@unhead/shared'

export default function extendNuxtConfigAppHeadSeoMeta(nuxt: Nuxt = useNuxt()): UseHeadInput<any> {
  // from the root public let's find which ones we can infer SEO meta and link tags from, following the Next.js convention
  // outlined in this site: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons
  // nuxt.options.app.seoMeta  is deprecated due to type complexities
  const seoMeta = nuxt.options.app?.seoMeta || nuxt.options.app?.head?.seoMeta || false
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
  delete nuxt.options.app.seoMeta
  return nuxt.options.app.head as any as UseHeadInput<any>
}
