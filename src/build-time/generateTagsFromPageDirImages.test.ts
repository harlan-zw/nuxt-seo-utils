import type { Nuxt } from '@nuxt/schema'
import type { SerializableHead, UseSeoMetaInput } from '@unhead/vue/types'
import type { NuxtApp } from 'nuxt/app'
import { Buffer } from 'node:buffer'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { useSeoMeta } from '@unhead/vue'
import { createHead as createClientHead, renderDOMHead } from '@unhead/vue/client'
import { createHead } from '@unhead/vue/server'
import { unpackMeta } from '@unhead/vue/utils'
import { Window } from 'happy-dom'
import { resolve } from 'pathe'
import { describe, expect, it, vi } from 'vitest'
import routeRulesPlugin from '../runtime/app/plugins/0.routeRules'
import pageImagesPlugin from '../runtime/app/plugins/pageImages.server'
import generateTagsFromPageDirImages from './generateTagsFromPageDirImages'

const runtime = vi.hoisted(() => ({
  rules: {} as Record<string, unknown>,
  payload: {} as { head?: SerializableHead, seoMeta?: UseSeoMetaInput },
  useHead: (_input: SerializableHead) => {},
  useSeoMeta: (_input: UseSeoMetaInput) => {},
}))

vi.mock('nuxt/app', () => ({
  defineNuxtPlugin: (plugin: unknown) => plugin,
  useRequestEvent: () => ({ context: { _nitro: { routeRules: runtime.rules } } }),
  useState: () => ({ value: runtime.payload }),
  useHead: (input: SerializableHead) => runtime.useHead(input),
  useSeoMeta: (input: UseSeoMetaInput) => runtime.useSeoMeta(input),
}))

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
  it.each(['/blog', '/blog/**'])('keeps server-only page image overrides during hydration for %s', async (route) => {
    const rootDir = await mkdtemp(resolve(tmpdir(), 'nuxt-seo-utils-pages-'))
    const window = new Window()
    try {
      const pagesDir = resolve(rootDir, 'app', 'pages')
      await mkdir(resolve(pagesDir, 'blog'), { recursive: true })
      await writeFile(resolve(pagesDir, 'blog', 'og-image.png'), createPng(1200, 630))
      await writeFile(resolve(pagesDir, 'blog', 'twitter-image.png'), createPng(1200, 600))
      await writeFile(resolve(pagesDir, 'blog', 'icon.png'), createPng(32, 32))
      const nuxt = createNuxt(rootDir, resolve(rootDir, 'app'))
      nuxt.options.routeRules!['/blog'] = { seoMeta: { description: 'Authored description' } }
      await generateTagsFromPageDirImages(nuxt, true)

      const rule = nuxt.options.routeRules![route]!
      const server = createHead()
      runtime.rules = nuxt.options.nitro.routeRules![route] as Record<string, unknown>
      runtime.useSeoMeta = input => useSeoMeta(input, { head: server })
      pageImagesPlugin({} as NuxtApp)
      window.document.head.innerHTML = server.render().headTags
      expect(window.document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('/blog/og-image.png')
      expect(window.document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe('/blog/twitter-image.png')

      server.push({ meta: unpackMeta({ ogImage: '/page.png', twitterImage: '/page-twitter.png' }) })
      window.document.head.innerHTML = server.render().headTags
      const client = createClientHead({ document: window.document as unknown as Document })
      runtime.payload = { head: rule.head as SerializableHead, seoMeta: rule.seoMeta }
      runtime.useHead = input => client.push(input)
      runtime.useSeoMeta = input => useSeoMeta(input, { head: client })
      routeRulesPlugin.setup!({} as NuxtApp)
      await renderDOMHead(client)

      expect(window.document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('/page.png')
      expect(window.document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe('/page-twitter.png')
      if (route === '/blog')
        expect(window.document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Authored description')
      expect(window.document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/blog/icon.png')
    }
    finally {
      await window.happyDOM.close()
      await rm(rootDir, { force: true, recursive: true })
    }
  })

  it.each([false, true])('preserves authored route images with server-only images: %s', async (serverOnly) => {
    const rootDir = await mkdtemp(resolve(tmpdir(), 'nuxt-seo-utils-pages-'))
    try {
      const pagesDir = resolve(rootDir, 'app', 'pages')
      await mkdir(resolve(pagesDir, 'blog'), { recursive: true })
      await writeFile(resolve(pagesDir, 'blog', 'og-image.png'), createPng(1200, 630))
      const nuxt = createNuxt(rootDir, resolve(rootDir, 'app'))
      nuxt.options.routeRules!['/blog'] = { seoMeta: { ogImage: '/authored.png', twitterImage: '/authored-twitter.png' } }
      await generateTagsFromPageDirImages(nuxt, serverOnly)

      const head = createHead()
      runtime.rules = nuxt.options.nitro.routeRules!['/blog'] as Record<string, unknown>
      runtime.useSeoMeta = input => useSeoMeta(input, { head })
      pageImagesPlugin({} as NuxtApp)
      useSeoMeta(nuxt.options.routeRules!['/blog']!.seoMeta!, { head })
      const window = new Window()
      try {
        window.document.head.innerHTML = head.render().headTags
        expect(window.document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('/authored.png')
        expect(window.document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe('/authored-twitter.png')
      }
      finally {
        await window.happyDOM.close()
      }
    }
    finally {
      await rm(rootDir, { force: true, recursive: true })
    }
  })

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
