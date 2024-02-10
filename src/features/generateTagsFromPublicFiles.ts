import type { Nuxt } from '@nuxt/schema'
import fg from 'fast-glob'
import { basename, resolve } from 'pathe'
import { useNuxt } from '@nuxt/kit'
import { defu } from 'defu'
import type { UseSeoMetaInput } from '@unhead/schema'
import { unpackMeta } from '@unhead/shared'
import { getImageDimensions, getImageDimensionsToSizes, getImageMeta, hasLinkRel, hasMetaProperty } from '../util'
import { MetaTagFileGlobs } from '../const'

export default async function generateTagsFromPublicFiles(nuxt: Nuxt = useNuxt()) {
  // @todo support layer public dirs
  const publicDirPath = resolve(nuxt.options.rootDir, nuxt.options.dir.public)
  // do fg only one level deep
  const rootPublicFiles = (await fg(MetaTagFileGlobs, { cwd: publicDirPath, onlyFiles: true, deep: 1 }))
    // use base name
    .map(file => basename(file))
  const headConfig = defu(nuxt.options.app.head, {
    link: [],
    meta: [],
  })

  if (!hasLinkRel(headConfig, 'icon')) {
    if (rootPublicFiles.includes('favicon.ico')) {
      headConfig.link.push({
        rel: 'icon',
        href: '/favicon.ico',
        sizes: 'any',
      })
    }

    const isIcon = (file: string) => file.includes('icon') && !file.endsWith('.ico')
    const isAppleTouchIcon = (file: string) => (
      (file.startsWith('apple-icon.') || file.startsWith('apple-touch-icon.') || file.startsWith('apple-touch.'))
    )

    headConfig.link.push(
      ...await Promise.all([
        ...rootPublicFiles
          .filter(file => isIcon(file) && !isAppleTouchIcon(file))
          .sort()
          .map(async (iconFile) => {
            const iconFileExt = iconFile.split('.').pop()
            const sizes = await getImageDimensionsToSizes(resolve(publicDirPath, iconFile))
            let media
            if (iconFile.includes('.dark'))
              media = '(prefers-color-scheme: dark)'
            else if (iconFile.includes('.light'))
              media = '(prefers-color-scheme: light)'
            return {
              rel: 'icon',
              href: `/${iconFile}`,
              type: `image/${iconFileExt}`,
              media,
              sizes,
            }
          }),
        ...rootPublicFiles
          .filter(file => isAppleTouchIcon(file))
          .sort()
          .map(async (appleIconFile) => {
            const appleIconFileExt = appleIconFile.split('.').pop()
            const sizes = await getImageDimensionsToSizes(resolve(publicDirPath, appleIconFile))
            return {
              rel: 'apple-touch-icon',
              href: `/${appleIconFile}`,
              type: `image/${appleIconFileExt}`,
              sizes,
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
      headConfig.meta.push(
        ...(await Promise.all(twitterImageFiles.map(async (twitterImageFile) => {
          const dimensions = await getImageDimensions(resolve(publicDirPath, twitterImageFile))
          return unpackMeta({
            twitterImage: {
              url: twitterImageFile,
              width: dimensions.width,
              height: dimensions.height,
            },
          })
        }))
        )
          .flat(),
      )
      hasTwitterImage = true
    }
  }
  // do og:image, duplicate to twitter:image if hasTwitterImage is false
  if (!hasMetaProperty(headConfig, 'og:image')) {
    const ogImageFiles = rootPublicFiles.filter(file => file.startsWith('og-image.') || file.startsWith('og.'))
      .sort()
    if (ogImageFiles.length) {
      headConfig.meta.push(
        ...(await Promise.all(ogImageFiles.map(async (src) => {
          const meta = await getImageMeta(publicDirPath, src)
          delete meta.sizes
          const seoMeta: UseSeoMetaInput = {
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
          .flat(),
      )
    }
  }

  nuxt.options.app.head = headConfig
}
