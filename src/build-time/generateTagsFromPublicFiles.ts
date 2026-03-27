import type { Nuxt } from '@nuxt/schema'
import type { Meta, SerializableHead } from '@unhead/vue/types'
import type { MetaFlatSerializable } from '../runtime/types'
import { readdir } from 'node:fs/promises'
import { useNuxt } from '@nuxt/kit'
import { unpackMeta } from '@unhead/vue/utils'
import { defu } from 'defu'
import { resolve } from 'pathe'
import { joinURL } from 'ufo'
import { isMetaTagFile } from '../const'
import { getImageDimensions, getImageMeta, hasLinkRel, hasMetaProperty } from '../util'

async function listMetaTagFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  return entries.filter(e => e.isFile() && isMetaTagFile(e.name)).map(e => e.name)
}

export default async function generateTagsFromPublicFiles(nuxt: Nuxt = useNuxt()): Promise<{ hasIcons: boolean }> {
  const publicDirs = nuxt.options._layers
    .map(layer => resolve(layer.config.rootDir!, layer.config.dir?.public || 'public'))

  // collect files from all layers, first layer (app) wins on conflicts
  const seen = new Set<string>()
  const fileEntries: { file: string, dir: string }[] = []
  for (const dir of publicDirs) {
    const files = await listMetaTagFiles(dir)
    for (const file of files) {
      if (!seen.has(file)) {
        seen.add(file)
        fileEntries.push({ file, dir })
      }
    }
  }

  const rootPublicFiles = fileEntries.map(e => e.file)
  const headConfig: SerializableHead = defu(nuxt.options.app.head, {
    link: [],
    meta: [],
  })

  if (!hasLinkRel(headConfig, 'icon')) {
    if (rootPublicFiles.includes('favicon.ico') && nuxt.options.app.baseURL !== '/') {
      headConfig.link!.push({
        rel: 'icon',
        href: joinURL(nuxt.options.app.baseURL, 'favicon.ico'),
        sizes: 'any',
      })
    }

    const isIcon = (file: string): boolean => file.includes('icon') && !file.endsWith('.ico')
    const isAppleTouchIcon = (file: string): boolean => (
      (file.includes('apple-icon') || file.includes('apple-touch-icon') || file.includes('apple-touch'))
    )

    const resolveDir = (file: string): string => fileEntries.find(e => e.file === file)!.dir

    headConfig.link!.push(
      ...await Promise.all([
        ...rootPublicFiles
          .filter(file => isIcon(file) && !isAppleTouchIcon(file))
          .sort()
          .map(async (iconFile) => {
            const meta = await getImageMeta(resolveDir(iconFile), iconFile, true)
            return {
              rel: 'icon',
              href: joinURL(nuxt.options.app.baseURL, iconFile),
              ...meta,
            }
          }),
        ...rootPublicFiles
          .filter(file => isAppleTouchIcon(file))
          .sort()
          .map(async (appleIconFile) => {
            const meta = await getImageMeta(resolveDir(appleIconFile), appleIconFile, true)
            return {
              rel: 'apple-touch-icon',
              href: joinURL(nuxt.options.app.baseURL, appleIconFile),
              ...meta,
            }
          }),
      ]),
    )
  }
  let hasTwitterImage = hasMetaProperty(headConfig, 'twitter:image')
  if (!hasTwitterImage) {
    // add the twitter image
    const twitterImageFiles = rootPublicFiles.filter(file => file.startsWith('twitter-image.'))
      .sort()
    if (twitterImageFiles.length) {
      headConfig.meta!.push(
        ...(await Promise.all(twitterImageFiles.map(async (twitterImageFile) => {
          const dimensions = await getImageDimensions(resolve(fileEntries.find(e => e.file === twitterImageFile)!.dir, twitterImageFile))
          return unpackMeta({
            twitterImage: {
              url: twitterImageFile,
              width: dimensions.width,
              height: dimensions.height,
            },
          })
        }))
        )
          .flat() as Meta[],
      )
      hasTwitterImage = true
    }
  }
  // do og:image, duplicate to twitter:image if hasTwitterImage is false
  if (!hasMetaProperty(headConfig, 'og:image')) {
    const ogImageFiles = rootPublicFiles.filter(file => file.startsWith('og-image.') || file.startsWith('og.'))
      .sort()
    if (ogImageFiles.length) {
      headConfig.meta!.push(
        ...(await Promise.all(ogImageFiles.map(async (src) => {
          const meta = await getImageMeta(fileEntries.find(e => e.file === src)!.dir, src, false)
          delete meta.sizes
          const seoMeta: MetaFlatSerializable = {
            ogImage: {
              url: src,
              ...meta,
            },
          }
          if (!hasTwitterImage) {
            seoMeta.twitterImage = {
              url: src,
              ...meta,
            }
          }
          return unpackMeta(seoMeta)
        }))
        )
          .flat() as Meta[],
      )
    }
  }

  nuxt.options.app.head = headConfig
  const hasIcons = rootPublicFiles.some(f => f.includes('icon') || f === 'favicon.ico')
  return { hasIcons }
}
