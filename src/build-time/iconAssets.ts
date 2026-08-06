import { Buffer } from 'node:buffer'

export type IconRel = 'icon' | 'apple-touch-icon'

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
const ICON_RE = /^(?:favicon\.(?:ico|png|svg)|(?:[^.]+\.)?icon(?:[.-][^.]+)?\.(?:ico|jpe?g|png|svg))$/i
const SIZE_RE = /^\d+x\d+$/

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
