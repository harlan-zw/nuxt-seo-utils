import type { Nuxt } from '@nuxt/schema'
import { Buffer } from 'node:buffer'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { Window } from 'happy-dom'
import { resolve } from 'pathe'
import { createHead as createClientHead } from 'unhead/client'
import { createHead } from 'unhead/server'
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
      rootDir,
      srcDir: rootDir,
      alias: {},
      _layers: [{ cwd: rootDir, config: { rootDir } }],
      app: { baseURL: '/', head: {} },
    },
  } as unknown as Nuxt
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { force: true, recursive: true })))
})

describe('generateTagsFromPublicFiles', () => {
  it.each([false, true])('keeps generated social images server-only with a dedicated Twitter image: %s', async (dedicatedTwitter) => {
    const files: Record<string, Buffer> = {
      'og-image.png': createPng(1200, 630),
      'icon.png': createPng(32, 32),
    }
    if (dedicatedTwitter)
      files['twitter-image.png'] = createPng(1200, 600)
    const nuxt = await nuxtWithPublicFiles(files)
    nuxt.options.app.head.meta = [{ name: 'description', content: 'Authored description' }]

    const { socialImageMeta } = await generateTagsFromPublicFiles(nuxt, true)

    expect(nuxt.options.app.head.meta).toEqual([{ name: 'description', content: 'Authored description' }])
    expect(nuxt.options.app.head.link).toContainEqual(expect.objectContaining({ rel: 'icon', href: '/icon.png' }))
    const head = createHead()
    head.push({ meta: socialImageMeta })
    const window = new Window()
    try {
      window.document.head.innerHTML = head.render().headTags
      expect(window.document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('og-image.png')
      expect(window.document.querySelector('meta[property="og:image:width"]')?.getAttribute('content')).toBe('1200')
      expect(window.document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe(dedicatedTwitter ? 'twitter-image.png' : 'og-image.png')

      head.push({ meta: [{ property: 'og:image', content: '/page.png' }, { name: 'twitter:image', content: '/page-twitter.png' }] })
      window.document.head.innerHTML = head.render().headTags
      const client = createClientHead({ document: window.document as unknown as Document })
      client.push(nuxt.options.app.head)
      client.render()
      expect(window.document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('/page.png')
      expect(window.document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe('/page-twitter.png')
    }
    finally {
      await window.happyDOM.close()
    }
  })

  it('preserves authored social images in the shared head', async () => {
    const nuxt = await nuxtWithPublicFiles({ 'og-image.png': createPng(1200, 630), 'icon.png': createPng(32, 32) })
    const authored = [{ property: 'og:image', content: '/authored.png' }, { name: 'twitter:image', content: '/authored-twitter.png' }]
    nuxt.options.app.head.meta = authored
    nuxt.options.app.head.link = [{ rel: 'icon', href: '/authored.ico' }]

    const { socialImageMeta } = await generateTagsFromPublicFiles(nuxt, true)

    expect(nuxt.options.app.head.meta).toEqual(authored)
    expect(nuxt.options.app.head.link).toEqual([{ rel: 'icon', href: '/authored.ico' }])
    expect(socialImageMeta).toEqual([])
  })

  it('reads opengraph-image as the og:image', async () => {
    const nuxt = await nuxtWithPublicFiles({ 'opengraph-image.png': createPng(1200, 630) })
    await generateTagsFromPublicFiles(nuxt)
    const meta = nuxt.options.app.head.meta || []
    expect(meta).toContainEqual({ property: 'og:image', content: 'opengraph-image.png' })
    expect(meta).toContainEqual({ property: 'og:image:width', content: 1200 })
  })
})
