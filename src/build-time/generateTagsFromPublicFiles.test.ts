import type { Nuxt } from '@nuxt/schema'
import { Buffer } from 'node:buffer'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'pathe'
import { afterEach, describe, expect, it } from 'vitest'
import generateTagsFromPublicFiles from './generateTagsFromPublicFiles'

function createPng(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(33)
  buffer.set(Buffer.from('89504e470d0a1a0a', 'hex'), 0)
  buffer.writeUInt32BE(13, 8)
  buffer.write('IHDR', 12, 'ascii')
  buffer.writeUInt32BE(width, 16)
  buffer.writeUInt32BE(height, 20)
  return buffer
}

const dirs: string[] = []

async function nuxtWithPublicFiles(files: Record<string, Buffer>): Promise<Nuxt> {
  const rootDir = await mkdtemp(resolve(tmpdir(), 'nuxt-seo-utils-public-'))
  dirs.push(rootDir)
  await mkdir(resolve(rootDir, 'public'))
  for (const [name, content] of Object.entries(files))
    await writeFile(resolve(rootDir, 'public', name), content)
  return {
    options: {
      _layers: [{ cwd: rootDir, config: { rootDir } }],
      app: { baseURL: '/', head: {} },
    },
  } as unknown as Nuxt
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { force: true, recursive: true })))
})

describe('generateTagsFromPublicFiles', () => {
  it('reads opengraph-image as the og:image', async () => {
    const nuxt = await nuxtWithPublicFiles({ 'opengraph-image.png': createPng(1200, 630) })
    await generateTagsFromPublicFiles(nuxt)
    const meta = nuxt.options.app.head.meta || []
    expect(meta).toContainEqual({ property: 'og:image', content: 'opengraph-image.png' })
    expect(meta).toContainEqual({ property: 'og:image:width', content: 1200 })
  })
})
