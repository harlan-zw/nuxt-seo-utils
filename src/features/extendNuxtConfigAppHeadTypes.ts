import { useNuxt } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import fg from 'fast-glob'
import { resolve } from 'pathe'
import { extendTypes } from '../kit'

export default function extendNuxtConfigAppHeadTypes(nuxt: Nuxt = useNuxt()) {
  extendTypes('nuxt-seo-experiments.assets', async () => {
    const paths = {
      public: await fg(['**/*'], { cwd: resolve(nuxt.options.srcDir, 'public') }),
      assets: await fg(['**/*'], { cwd: resolve(nuxt.options.srcDir, 'assets') }),
    }
    return `
declare module '#app/nuxt' {
  import { HeadEntry, HeadTag } from '@unhead/schema'

  interface RuntimeNuxtHooks {
    'head:tags': (tag: HeadTag[]) => Promise<void> | void
    'head:entries': (entries: HeadEntry[]) => Promise<void> | void
  }
}

type PublicFiles = ${[...paths.public.map(path => `'/${path}'`), '(string & Record<never, never>)'].join(' | ')}
type AssetFiles = ${[...paths.assets.map(path => `'~/${path}'`), '(string & Record<never, never>)'].join(' | ')}

declare module '@nuxt/schema' {
  interface HeadAugmentations {
    link: {
      href: PublicFiles | AssetFiles
    }
    script: {
      src: PublicFiles | AssetFiles
    }
  }
}`
  })
}
