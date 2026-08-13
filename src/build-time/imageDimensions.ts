import { Buffer } from 'node:buffer'

export interface ImageDimension {
  width: number
  height: number
}

export interface ImageDimensions extends ImageDimension {
  images?: ImageDimension[]
}

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex')
const SVG_ROOT_RE = /<svg(?:\s|>)/i
const SVG_LENGTH_RE = /^((?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(cm|em|ex|in|m|mm|pc|pt|px)?$/i
const SVG_UNIT_PIXELS: Record<string, number> = {
  cm: 96 / 2.54,
  em: 16,
  ex: 8,
  in: 96,
  m: 96 / 2.54 * 100,
  mm: 96 / 2.54 / 10,
  pc: 96 / 72 / 12,
  pt: 96 / 72,
  px: 1,
}

function validDimensions(width: number, height: number): ImageDimensions | undefined {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    return undefined
  return { width, height }
}

function parsePng(buffer: Buffer): ImageDimensions | undefined {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE))
    return undefined
  if (buffer.readUInt32BE(8) !== 13 || buffer.toString('ascii', 12, 16) !== 'IHDR')
    return undefined
  return validDimensions(buffer.readUInt32BE(16), buffer.readUInt32BE(20))
}

function parseGif(buffer: Buffer): ImageDimensions | undefined {
  if (buffer.length < 10 || !['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6)))
    return undefined
  return validDimensions(buffer.readUInt16LE(6), buffer.readUInt16LE(8))
}

function isJpegSizeMarker(marker: number): boolean {
  return marker >= 0xC0 && marker <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(marker)
}

function parseJpeg(buffer: Buffer): ImageDimensions | undefined {
  if (buffer.length < 4 || buffer[0] !== 0xFF || buffer[1] !== 0xD8)
    return undefined

  let offset = 2
  while (offset < buffer.length) {
    while (offset < buffer.length && buffer[offset] !== 0xFF)
      offset++
    while (offset < buffer.length && buffer[offset] === 0xFF)
      offset++
    if (offset >= buffer.length)
      return undefined

    const marker = buffer[offset++]!
    if (marker === 0xD9 || marker === 0xDA)
      return undefined
    if ((marker >= 0xD0 && marker <= 0xD7) || marker === 0x01)
      continue
    if (offset + 2 > buffer.length)
      return undefined

    const segmentLength = buffer.readUInt16BE(offset)
    if (segmentLength < 2 || offset + segmentLength > buffer.length)
      return undefined
    if (isJpegSizeMarker(marker)) {
      if (segmentLength < 11)
        return undefined
      const componentCount = buffer[offset + 7]!
      if (componentCount === 0 || segmentLength !== 8 + componentCount * 3)
        return undefined
      return validDimensions(buffer.readUInt16BE(offset + 5), buffer.readUInt16BE(offset + 3))
    }
    offset += segmentLength
  }
  return undefined
}

function parseIco(buffer: Buffer): ImageDimensions | undefined {
  if (buffer.length < 6 || buffer.readUInt16LE(0) !== 0 || buffer.readUInt16LE(2) !== 1)
    return undefined

  const count = buffer.readUInt16LE(4)
  const directoryEnd = 6 + count * 16
  if (count === 0 || directoryEnd > buffer.length)
    return undefined

  const images = Array.from({ length: count }, (_, index) => {
    const offset = 6 + index * 16
    const payloadSize = buffer.readUInt32LE(offset + 8)
    const payloadOffset = buffer.readUInt32LE(offset + 12)
    if (payloadSize === 0 || payloadOffset < directoryEnd || payloadOffset > buffer.length - payloadSize)
      return undefined
    return {
      width: buffer[offset] || 256,
      height: buffer[offset + 1] || 256,
    }
  })
  if (images.includes(undefined))
    return undefined
  const validImages = images as ImageDimension[]
  const largestImage = validImages.reduce((largest, image) =>
    image.width * image.height > largest.width * largest.height ? image : largest)
  return { ...largestImage, images: validImages }
}

function parseSvgLength(root: string, name: string): number | undefined {
  const value = root.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1]?.trim()
  if (!value)
    return undefined
  const match = SVG_LENGTH_RE.exec(value)
  if (!match)
    return undefined
  const parsed = Number(match[1]) * (SVG_UNIT_PIXELS[match[2]?.toLowerCase() || 'px'] || 1)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined
}

function parseSvg(buffer: Buffer): ImageDimensions | undefined {
  const source = buffer.toString('utf8', 0, Math.min(buffer.length, 4096))
  const rootStart = source.search(SVG_ROOT_RE)
  const rootEnd = source.indexOf('>', rootStart)
  if (rootStart < 0 || rootEnd < 0)
    return undefined

  const root = source.slice(rootStart, rootEnd + 1)
  const width = parseSvgLength(root, 'width')
  const height = parseSvgLength(root, 'height')
  if (width && height)
    return { width, height }

  const viewBox = root.match(/(?:^|\s)viewBox\s*=\s*["']([^"']+)["']/i)?.[1]
    ?.trim()
    .split(/[\s,]+/)
    .map(Number)
  if (!viewBox || viewBox.length !== 4 || !viewBox.every(value => Number.isFinite(value)))
    return undefined
  const viewBoxDimensions = validDimensions(Math.round(viewBox[2]!), Math.round(viewBox[3]!))
  if (!viewBoxDimensions)
    return undefined
  if (width)
    return { width, height: Math.floor(width * viewBoxDimensions.height / viewBoxDimensions.width) }
  if (height)
    return { width: Math.floor(height * viewBoxDimensions.width / viewBoxDimensions.height), height }
  return viewBoxDimensions
}

export function parseImageDimensions(buffer: Buffer): ImageDimensions | undefined {
  return parsePng(buffer)
    || parseGif(buffer)
    || parseJpeg(buffer)
    || parseIco(buffer)
    || parseSvg(buffer)
}
