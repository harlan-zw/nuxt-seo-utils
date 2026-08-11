import type { Link } from '@unhead/vue/types'
import type { ColorModeIconLinks } from '../runtime/types'
import { Buffer } from 'node:buffer'

export type IconRel = 'icon' | 'apple-touch-icon'

export type ResolvedColorModeIconLinks
  = | { _tag: 'StaticIconLinks', links: Link[] }
    | { _tag: 'ReactiveIconLinks', links: Link[], icons: ColorModeIconLinks }

export type IconDiagnostic
  = | {
    _tag: 'IconSizesNormalized'
    href: string
    configured: string
    resolved: string
  }
  | {
    _tag: 'IconHrefNormalized'
    configured: string
    resolved: string
  }

export interface IcoPng {
  buffer: Buffer
  width: number
  height: number
}

const APPLE_ICON_RE = /^(?:[^.]+\.)?apple-(?:icon|touch(?:-icon)?)(?:[.-][^.]+)?\.(?:jpe?g|png)$/i
const ICON_RE = /^(?:favicon(?:[.-][^.]+)?\.(?:ico|jpe?g|png|svg)|(?:[^.]+\.)?icon(?:[.-][^.]+)?\.(?:ico|jpe?g|png|svg))$/i
const SIZE_RE = /^\d+x\d+$/
const COLOR_SCHEME_MEDIA_RE = /^\(\s*prefers-color-scheme\s*:\s*(dark|light)\s*\)$/i

export function classifyIconFilename(filename: string): IconRel | undefined {
  if (APPLE_ICON_RE.test(filename))
    return 'apple-touch-icon'
  if (ICON_RE.test(filename))
    return 'icon'
}

export function getIconRel(rel: unknown): IconRel | undefined {
  if (typeof rel !== 'string')
    return
  const tokens = rel.toLowerCase().split(/\s+/)
  if (tokens.includes('apple-touch-icon'))
    return 'apple-touch-icon'
  if (tokens.includes('icon'))
    return 'icon'
}

function getIconColorMode(media: unknown): keyof ColorModeIconLinks | undefined {
  if (typeof media !== 'string')
    return
  return COLOR_SCHEME_MEDIA_RE.exec(media.trim())?.[1]?.toLowerCase() as keyof ColorModeIconLinks | undefined
}

export function partitionColorModeIconLinks(links: Link[]): ResolvedColorModeIconLinks {
  const candidates = links.map((link, index) => {
    const iconLink = link as Link & { media?: string }
    return {
      index,
      link: iconLink,
      mode: getIconColorMode(iconLink.media),
      rel: getIconRel(iconLink.rel),
    }
  })
  const reactiveRels = new Set<IconRel>()

  for (const rel of ['icon', 'apple-touch-icon'] as const) {
    const modes = new Set(candidates.filter(candidate => candidate.rel === rel).map(candidate => candidate.mode))
    if (modes.has('dark') && modes.has('light'))
      reactiveRels.add(rel)
  }

  if (reactiveRels.size === 0)
    return { _tag: 'StaticIconLinks', links }

  const icons: ColorModeIconLinks = { dark: [], light: [] }
  const reactiveIndexes = new Set<number>()
  for (const candidate of candidates) {
    if (!candidate.rel || !candidate.mode || !reactiveRels.has(candidate.rel))
      continue
    const { media: _, ...link } = candidate.link
    icons[candidate.mode].push(link as Link)
    reactiveIndexes.add(candidate.index)
  }

  return {
    _tag: 'ReactiveIconLinks',
    links: links.filter((_, index) => !reactiveIndexes.has(index)),
    icons,
  }
}

export function normalizeIconSizes(configured: unknown, resolved: string): {
  sizes: string
  normalized: boolean
} {
  if (typeof configured !== 'string' || !configured.trim())
    return { sizes: resolved, normalized: false }
  if (resolved === 'any')
    return { sizes: configured, normalized: false }

  const resolvedSizes = new Set(resolved.split(/\s+/))
  const configuredSizes = configured.toLowerCase().trim().split(/\s+/)
  const isValidSubset = configuredSizes.every(size => SIZE_RE.test(size) && resolvedSizes.has(size))
  return isValidSubset
    ? { sizes: configured, normalized: false }
    : { sizes: resolved, normalized: true }
}

/** Wraps PNG buffers in an ICO container. */
export function pngToIco(images: IcoPng[]): Buffer {
  const headerSize = 6
  const directoryEntrySize = 16
  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  let offset = headerSize + directoryEntrySize * images.length
  const directoryEntries = images.map(({ buffer, width, height }) => {
    const entry = Buffer.alloc(directoryEntrySize)
    entry.writeUInt8(width === 256 ? 0 : width, 0)
    entry.writeUInt8(height === 256 ? 0 : height, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(buffer.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += buffer.length
    return entry
  })

  return Buffer.concat([header, ...directoryEntries, ...images.map(image => image.buffer)])
}
