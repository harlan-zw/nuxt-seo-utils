import type { Nuxt } from '@nuxt/schema'
import { useNuxt } from '@nuxt/kit'
import fg from 'fast-glob'
import { resolve } from 'pathe'
import { extendTypes } from '../kit'

export default function extendNuxtConfigAppHeadTypes(nuxt: Nuxt = useNuxt()) {
  extendTypes('nuxt-seo-utils.assets', async () => {
    const paths = (await fg(['**/*'], { cwd: resolve(nuxt.options.srcDir, 'public') })).map(p => `/${p}`)
    const jsPaths = paths.filter(p => p.endsWith('.js') || p.endsWith('.mjs'))
    return `
declare module '#app' {
  import { HeadEntry, HeadTag } from '@unhead/schema'

  interface RuntimeNuxtHooks {
    'head:tags': (tag: HeadTag[]) => Promise<void> | void
    'head:entries': (entries: HeadEntry[]) => Promise<void> | void
  }
}
declare module '@unhead/schema' {

  type PublicFiles = ${[...paths.map(p => `'${p}'`), '(string & Record<never, never>)'].join(' | ')}
  type JsFiles = ${[...jsPaths.map(p => `'${p}'`), '(string & Record<never, never>)'].join(' | ')}

  interface SchemaAugmentations {
    link: import('@unhead/schema').UserTagConfigWithoutInnerContent & {
      href: PublicFiles
    }
    script: import('@unhead/schema').TagUserProperties & {
      src: JsFiles
    }
  }
}`
  })
}
