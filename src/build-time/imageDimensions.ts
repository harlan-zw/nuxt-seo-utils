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

function validDimensions(width: number, height: number): ImageDimensions | undefined {
  if (width <= 0 || height <= 0)
    return undefined
  return { width, height }
}

function parsePng(buffer: Buffer): ImageDimensions | undefined {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE))
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
    if (isJpegSizeMarker(marker) && segmentLength >= 7)
      return validDimensions(buffer.readUInt16BE(offset + 5), buffer.readUInt16BE(offset + 3))
    offset += segmentLength
  }
  return undefined
}

function parseIco(buffer: Buffer): ImageDimensions | undefined {
  if (buffer.length < 6 || buffer.readUInt16LE(0) !== 0 || buffer.readUInt16LE(2) !== 1)
    return undefined

  const count = buffer.readUInt16LE(4)
  if (count === 0 || 6 + count * 16 > buffer.length)
    return undefined

  const images = Array.from({ length: count }, (_, index) => {
    const offset = 6 + index * 16
    return {
      width: buffer[offset] || 256,
      height: buffer[offset + 1] || 256,
    }
  })
  return { ...images[0]!, images }
}

function parseSvgLength(root: string, name: string): number | undefined {
  const value = root.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([0-9.]+)(?:px)?["']`, 'i'))?.[1]
  if (!value)
    return undefined
  const parsed = Number(value)
  return parsed > 0 ? parsed : undefined
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
  if (!viewBox || viewBox.length !== 4)
    return undefined
  const viewBoxDimensions = validDimensions(viewBox[2]!, viewBox[3]!)
  if (!viewBoxDimensions)
    return undefined
  if (width)
    return { width, height: width * viewBoxDimensions.height / viewBoxDimensions.width }
  if (height)
    return { width: height * viewBoxDimensions.width / viewBoxDimensions.height, height }
  return viewBoxDimensions
}

export function parseImageDimensions(buffer: Buffer): ImageDimensions | undefined {
  return parsePng(buffer)
    || parseGif(buffer)
    || parseJpeg(buffer)
    || parseIco(buffer)
    || parseSvg(buffer)
}
