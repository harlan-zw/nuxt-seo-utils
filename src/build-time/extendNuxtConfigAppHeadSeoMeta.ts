import type { Nuxt } from '@nuxt/schema'
import type { MetaFlatSerializable } from '../runtime/types'
import { useNuxt } from '@nuxt/kit'
import { unpackMeta } from '@unhead/vue/utils'

export default function extendNuxtConfigAppHeadSeoMeta(nuxt: Nuxt = useNuxt()): void {
  // from the root public let's find which ones we can infer SEO meta and link tags from, following the Next.js convention
  // outlined in this site: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons
  const seoMeta: MetaFlatSerializable = nuxt.options.app?.seoMeta || nuxt.options.app?.head?.seoMeta || {}
  // @ts-expect-error untyped
  const configSeoMeta: MetaFlatSerializable = nuxt.options.seo?.meta || nuxt.options.seo?.seoMeta || {}
  if (!seoMeta && !configSeoMeta)
    return
  nuxt.options.app.head = nuxt.options.app.head || {}
  nuxt.options.app.head = {
    ...nuxt.options.app.head,
    meta: [
      ...nuxt.options.app.head.meta || [],
      ...unpackMeta(seoMeta),
      ...unpackMeta(configSeoMeta || {}),
      // Unhead accepts null and array content.
      // Nuxt's static head type remains narrower.
    ] as NonNullable<Nuxt['options']['app']['head']['meta']>,
  }
  delete nuxt.options.app.seoMeta
  delete nuxt.options.app.head.seoMeta
}
