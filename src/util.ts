import { readFile } from 'node:fs/promises'
import type { Head } from '@unhead/schema'
import imageSize from 'image-size'

export function hasLinkRel(input: Head, rel: string) {
  return input.link?.some(link => link.rel === rel)
}

export function hasMetaProperty(input: Head, property: string) {
  return input.meta?.some(meta => meta.property === property)
}

export async function getImageDimensions(absolutePath: string) {
  // read the file into a buffer using fs
  const buffer = await readFile(absolutePath)
  return imageSize(buffer)
}

export async function getImageDimensionsToSizes(absolutePath: string) {
  try {
    // read the file into a buffer using fs
    const { width, height } = await getImageDimensions(absolutePath)
    return `${width}x${height}`
  }
  catch {}
  // okay to fail, we fallback to any
  return 'any'
}
