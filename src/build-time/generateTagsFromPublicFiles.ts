import type { Nuxt } from '@nuxt/schema'
import type { Link, Meta, SerializableHead } from '@unhead/vue/types'
import type { MetaFlatSerializable } from '../runtime/types'
import type { IconDiagnostic, IconRel } from './iconAssets'
import { readdir } from 'node:fs/promises'
import { useNuxt } from '@nuxt/kit'
import { unpackMeta } from '@unhead/vue/utils'
import { defu } from 'defu'
import { basename, resolve } from 'pathe'
import { joinURL } from 'ufo'
import { isMetaTagFile } from '../const'
import { getImageDimensions, getImageMeta, hasMetaProperty } from '../util'
import { classifyIconFilename, getIconRel, normalizeIconSizes } from './iconAssets'

interface IconFileEntry {
  file: string
  dir: string
  rel: IconRel
  type: string
  sizes: string
  media?: string
}

interface LocalIconMatch {
  entry: IconFileEntry
  resolvedHref: string
}

type ConfiguredIconLink = Link & {
  href?: string
  media?: string
  sizes?: string
  type?: string
}

async function listMetaTagFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT')
      return []
    throw error
  })
  return entries.filter(e => e.isFile() && isMetaTagFile(e.name)).map(e => e.name)
}

function findLocalIcon(href: unknown, baseURL: string, iconEntries: IconFileEntry[]): LocalIconMatch | undefined {
  if (typeof href !== 'string' || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href))
    return
  const path = href.split(/[?#]/, 1)[0] || ''
  const file = basename(path)
  const entry = iconEntries.find(icon => icon.file === file)
  if (!entry)
    return
  const validPaths = new Set([entry.file, `/${entry.file}`, joinURL(baseURL, entry.file)])
  return validPaths.has(path)
    ? { entry, resolvedHref: `${joinURL(baseURL, entry.file)}${href.slice(path.length)}` }
    : undefined
}

function enrichConfiguredIcon(link: Link, baseURL: string, iconEntries: IconFileEntry[], diagnostics: IconDiagnostic[]): Link {
  const iconLink = link as ConfiguredIconLink
  const match = findLocalIcon(iconLink.href, baseURL, iconEntries)
  if (!match)
    return link
  const { entry, resolvedHref } = match

  if (iconLink.href !== resolvedHref) {
    diagnostics.push({
      _tag: 'IconHrefNormalized',
      configured: String(iconLink.href),
      resolved: resolvedHref,
    })
  }

  const normalizedSizes = normalizeIconSizes(iconLink.sizes, entry.sizes)
  if (normalizedSizes.normalized) {
    diagnostics.push({
      _tag: 'IconSizesNormalized',
      href: String(iconLink.href),
      configured: String(iconLink.sizes),
      resolved: entry.sizes,
    })
  }
  return {
    ...iconLink,
    href: resolvedHref,
    type: iconLink.type || entry.type,
    sizes: normalizedSizes.sizes,
    media: iconLink.media || entry.media,
  } as Link
}

export default async function generateTagsFromPublicFiles(nuxt: Nuxt = useNuxt()): Promise<{ hasIcons: boolean, diagnostics: IconDiagnostic[] }> {
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

  const iconEntries = (await Promise.all(fileEntries.map(async ({ file, dir }): Promise<IconFileEntry | undefined> => {
    const rel = classifyIconFilename(file)
    if (!rel)
      return
    const meta = await getImageMeta(dir, file, true)
    return {
      file,
      dir,
      rel,
      type: String(meta.type),
      sizes: String(meta.sizes),
      media: meta.media ? String(meta.media) : undefined,
    }
  }))).filter(entry => entry !== undefined)

  const diagnostics: IconDiagnostic[] = []
  headConfig.link = headConfig.link!.map(link => enrichConfiguredIcon(link as Link, nuxt.options.app.baseURL, iconEntries, diagnostics))
  const configuredIconRels = new Set(headConfig.link.map(link => getIconRel(link.rel)).filter(rel => rel !== undefined))

  for (const rel of ['icon', 'apple-touch-icon'] as const) {
    if (configuredIconRels.has(rel))
      continue
    headConfig.link.push(...iconEntries
      .filter(entry => entry.rel === rel)
      .sort((a, b) => a.file.localeCompare(b.file))
      .map(entry => ({
        rel: entry.rel,
        type: entry.type,
        href: joinURL(nuxt.options.app.baseURL, entry.file),
        sizes: entry.sizes,
        media: entry.media,
      })))
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
  const hasIcons = iconEntries.length > 0 || configuredIconRels.size > 0
  return { hasIcons, diagnostics }
}
