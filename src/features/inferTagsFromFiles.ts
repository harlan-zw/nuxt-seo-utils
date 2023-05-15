import type { Nuxt } from '@nuxt/schema'
import fg from 'fast-glob'
import { basename, resolve } from 'pathe'
import { withBase } from 'ufo'
import { getImageDimensions, getImageDimensionsToSizes, hasLinkRel, hasMetaProperty } from '../util'

export default async function inferTagsFromFiles(nuxt: Nuxt, { siteUrl }: { siteUrl: string }) {
  // @todo support dynamic public dirs
  const publicDirPath = resolve(nuxt.options.srcDir, 'public')
  // do fg only one level deep
  const rootPublicFiles = (await fg(['**/*'], { cwd: publicDirPath, onlyFiles: true, deep: 1 }))
    // use base name
    .map(file => basename(file))
  // from the root public let's find which ones we can infer SEO meta and link tags from, following the Next.js convention
  // outlined in this site: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons
  const headConfig = nuxt.options.app.head
  headConfig.link = headConfig.link || []
  headConfig.htmlAttrs = headConfig.htmlAttrs || {}
  headConfig.link = headConfig.link || []
  headConfig.meta = headConfig.meta || []

  // We are going to infer the icon based on the root public files, the rules are as follows:
  // - When we have a favicon.ic we add a <link rel="icon" href="/favicon.ico" sizes="any" />
  // - When we have a icon.(ico|jpg|jpeg|png|svg) we add a <link rel="icon" href="/icon?<generated>" type="image/<generated>" sizes="<generated>"> (read the file for the size)
  // - When we have a apple-icon.(jpg|jpeg|png|svg) we add a <link rel="apple-touch-icon" href="/apple-icon?<generated>" type="image/<generated>" sizes="<generated>"> (read the file for the size)
  // - When we have an icon numbered we can add multiple icon tags icon1.(ico|jpg|jpeg|png|svg), icon2.(ico|jpg|jpeg|png|svg), etc. Numbered files will sort lexically.
  // - sizes="any" is added to favicon.ico output to avoid a browser bug where an .ico icon is favored over .svg.
  if (!hasLinkRel(headConfig, 'icon')) {
    if (rootPublicFiles.includes('favicon.ico')) {
      headConfig.link.push({
        rel: 'icon',
        href: '/favicon.ico',
        sizes: 'any',
      })
    }
    headConfig.link.push(
      ...await Promise.all([
        ...rootPublicFiles
          .filter(file => file.startsWith('icon') || file.startsWith('favicon-'))
          .sort()
          .map(async (iconFile) => {
            const iconFileExt = iconFile.split('.').pop()
            const sizes = await getImageDimensionsToSizes(resolve(publicDirPath, iconFile))
            return {
              rel: 'icon',
              href: `/${iconFile}`,
              type: `image/${iconFileExt}`,
              sizes,
            }
          }),
        ...rootPublicFiles.filter(file => file.startsWith('apple-icon') || file.startsWith('apple-touch-icon'))
          .sort()
          .map(async (appleIconFile) => {
            const appleIconFileExt = appleIconFile.split('.').pop()
            const sizes = await getImageDimensionsToSizes(resolve(publicDirPath, appleIconFile))
            return {
              rel: 'apple-touch-icon',
              href: `/apple-icon.${appleIconFileExt}`,
              type: `image/${appleIconFileExt}`,
              sizes,
            }
          }),
      ]),
    )
  }
  // Now we do the og:image and twitter:image, the rules are as follows:
  // - When we have a twitter-image.(jpg|jpeg|png|svg) we add a <meta name="twitter:image" content="/twitter-image?<generated>" /> and other tags (twitter:image:width, twitter:image:height)
  // - When we have a og-image.(jpg|jpeg|png|svg) we add a <meta property="og:image" content="/og-image?<generated>" /> and other tags (og:image:width, og:image:height). If no tiwtter image is set, we
  //   set that as well.
  // - You can set multiple Open Graph images for a route segment by adding a number suffix to the file name. For example, opengraph-image1.(jpg|tsx), opengraph-image2// .(jpg|tsx), etc. Numbered files will sort lexically within their given segment.
  // - We generate the og:image:width and og:image:height by reading the image file and getting the width and height
  // - Assuming there is no image set for either already
  let hasTwitterImage = hasMetaProperty(headConfig, 'twitter:image')
  if (!hasTwitterImage) {
    // add the twitter image
    const twitterImageFiles = rootPublicFiles.filter(file => file.startsWith('twitter-image'))
      .sort()
    if (twitterImageFiles.length) {
      headConfig.meta.push(
        ...(await Promise.all(twitterImageFiles.map(async (twitterImageFile) => {
          const twitterImageFileSizes = await getImageDimensions(resolve(publicDirPath, twitterImageFile))
          return [
            {
              name: 'twitter:image',
              // needs to be absolute, use runtimeConfig.public.siteUrl
              content: withBase(twitterImageFile, siteUrl),
            },
            {
              name: 'twitter:image:width',
              content: twitterImageFileSizes.width,
            },
            {
              name: 'twitter:image:height',
              content: twitterImageFileSizes.height,
            },
          ]
        }))
        )
          .flat(),
      )
      hasTwitterImage = true
    }
  }
  // do og:image, duplicate to twitter:image if hasTwitterImage is false
  if (!hasMetaProperty(headConfig, 'og:image')) {
    const ogImageFiles = rootPublicFiles.filter(file => file.startsWith('og-image'))
      .sort()
    if (ogImageFiles.length) {
      headConfig.meta.push(
        ...(await Promise.all(ogImageFiles.map(async (ogImageFile) => {
          const ogImageFileSizes = await getImageDimensions(resolve(publicDirPath, ogImageFile))
          const tags = [
            {
              property: 'og:image',
              content: withBase(ogImageFile, siteUrl),
            },
            {
              property: 'og:image:width',
              content: ogImageFileSizes.width,
            },
            {
              property: 'og:image:height',
              content: ogImageFileSizes.height,
            },
          ]
          if (!hasTwitterImage) {
            tags.push(...[
              {
                name: 'twitter:image',
                content: withBase(ogImageFile, siteUrl),
              },
              {
                name: 'twitter:image:width',
                content: ogImageFileSizes.width,
              },
              {
                name: 'twitter:image:height',
                content: ogImageFileSizes.height,
              },
            ])
          }
          return tags
        }))
        )
          .flat(),
      )
    }
  }

  nuxt.options.app.head = headConfig
}
