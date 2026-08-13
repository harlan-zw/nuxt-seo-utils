import type { SerializableHead } from '@unhead/vue/types'
import fs from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'pathe'
import { parseImageDimensions } from './build-time/imageDimensions'

export function hasMetaProperty(input: SerializableHead, property: string): boolean | undefined {
  return input.meta?.some(meta => meta.property === property)
}

const ALT_NEWLINE_RE = /\n/g

export async function getImageMeta(base: string, path: string, isIcon = false): Promise<Record<string, undefined | number | string>> {
  const absolutePath = resolve(base, path)
  const file = absolutePath.split('/').pop()
  const keyword = file!.split('.')[0]
  let ext = absolutePath.split('.').pop()?.toLowerCase()
  if (ext === 'jpg')
    ext = 'jpeg'
  const { width, height, images } = await getImageDimensions(absolutePath)
  const payload: Record<string, undefined | number | string> = {
    type: ext === 'svg'
      ? 'image/svg+xml'
      : ext === 'ico'
        ? 'image/vnd.microsoft.icon'
        : `image/${ext}`,
  }
  if (!isIcon) {
    payload.width = width
    payload.height = height
    const altTextPath = resolve(dirname(absolutePath), `${keyword}.alt.txt`)
    if (fs.existsSync(altTextPath)) {
      payload.alt = fs.readFileSync(altTextPath, 'utf8')
      // need to normalise alt for og:image:alt
      payload.alt = String(payload.alt).replace(ALT_NEWLINE_RE, ' ').trim()
    }
  }
  else {
    if (path.includes('.dark') || path.includes('-dark'))
      payload.media = '(prefers-color-scheme: dark)'
    else if (path.includes('.light') || path.includes('-light'))
      payload.media = '(prefers-color-scheme: light)'
    if (ext === 'ico' && images?.length) {
      payload.sizes = [...new Map(images.map(image => [`${image.width}x${image.height}`, image])).values()]
        .sort((a, b) => (a.width * a.height) - (b.width * b.height))
        .map(image => `${image.width}x${image.height}`)
        .join(' ')
    }
    else if (ext !== 'svg') {
      payload.sizes = `${width}x${height}`
    }
    else {
      payload.sizes = 'any'
    }
  }
  return payload
}
export async function getImageDimensions(absolutePath: string) {
  const buffer = await readFile(absolutePath)
  const dimensions = parseImageDimensions(buffer)
  if (!dimensions)
    throw new TypeError(`Unsupported image format: ${absolutePath}`)
  return {
    width: dimensions.width,
    height: dimensions.height,
    images: dimensions.images,
  }
}
