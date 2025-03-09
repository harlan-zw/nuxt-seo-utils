import type { Nuxt } from '@nuxt/schema'
import { useNuxt } from '@nuxt/kit'
import { unpackMeta } from '@unhead/vue/utils'

export default function extendNuxtConfigAppHeadSeoMeta(nuxt: Nuxt = useNuxt()) {
  // from the root public let's find which ones we can infer SEO meta and link tags from, following the Next.js convention
  // outlined in this site: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons
  // nuxt.options.app.seoMeta is deprecated due to type complexities
  // these other modes are deprecated because the tpyes are too difficult
  const seoMeta = nuxt.options.app?.seoMeta || nuxt.options.app?.head?.seoMeta || false
  const configSeoMeta = nuxt.options.seo?.meta || nuxt.options.seo?.seoMeta || false
  if (!seoMeta && !configSeoMeta)
    return
  nuxt.options.app.head = nuxt.options.app.head || {}
  nuxt.options.app.head = {
    ...nuxt.options.app.head,
    meta: [
      ...nuxt.options.app.head.meta || [],
      ...unpackMeta(seoMeta || {}),
      ...unpackMeta(configSeoMeta || {}),
    ],
  }
  delete nuxt.options.app.seoMeta
  delete nuxt.options.app.head.seoMeta
}
