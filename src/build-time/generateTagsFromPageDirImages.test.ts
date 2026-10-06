import type { Nuxt } from '@nuxt/schema'
import { Buffer } from 'node:buffer'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'pathe'
import { describe, expect, it, vi } from 'vitest'
import generateTagsFromPageDirImages from './generateTagsFromPageDirImages'

function createPng(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(33)
  buffer.set(Buffer.from('89504e470d0a1a0a', 'hex'), 0)
  buffer.writeUInt32BE(13, 8)
  buffer.write('IHDR', 12, 'ascii')
  buffer.writeUInt32BE(width, 16)
  buffer.writeUInt32BE(height, 20)
  return buffer
}

function createNuxt(rootDir: string, srcDir: string): Nuxt {
  return {
    options: {
      rootDir,
      srcDir,
      alias: {},
      _layers: [{ cwd: rootDir, config: { rootDir, srcDir } }],
      app: { baseURL: '/' },
      dev: false,
      routeRules: {},
      nitro: { routeRules: {} },
    },
    hooks: { hook: vi.fn() },
  } as unknown as Nuxt
}

describe('generateTagsFromPageDirImages', () => {
  it('finds page dir images under a Nuxt 4 app/ srcDir (#143)', async () => {
    const rootDir = await mkdtemp(resolve(tmpdir(), 'nuxt-seo-utils-pages-'))
    try {
      const pagesDir = resolve(rootDir, 'app', 'pages')
      await mkdir(resolve(pagesDir, 'blog'), { recursive: true })
      await writeFile(resolve(pagesDir, 'blog', 'og-image.png'), createPng(1270, 630))

      const nuxt = createNuxt(rootDir, resolve(rootDir, 'app'))
      await generateTagsFromPageDirImages(nuxt)

      const routeRule = (nuxt.options.routeRules as Record<string, any>)['/blog']
      expect(routeRule).toBeDefined()
      expect(routeRule.seoMeta.ogImage).toMatchObject({
        url: '/blog/og-image.png',
        type: 'image/png',
        width: 1270,
        height: 630,
      })
      expect((nuxt.options.routeRules as Record<string, any>)['/blog/**']).toBeDefined()
    }
    finally {
      await rm(rootDir, { force: true, recursive: true })
    }
  })
})
