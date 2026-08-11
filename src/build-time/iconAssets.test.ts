import type { Nuxt } from '@nuxt/schema'
import type { Link, SerializableHead } from '@unhead/vue/types'
import { Buffer } from 'node:buffer'
import { createResolver } from '@nuxt/kit'
import imageSize from 'image-size'
import { describe, expect, it } from 'vitest'
import generateTagsFromPublicFiles from './generateTagsFromPublicFiles'
import { classifyIconFilename, getIconRel, partitionColorModeIconLinks, pngToIco } from './iconAssets'

const { resolve } = createResolver(import.meta.url)

function createNuxt(rootDir: string, head: SerializableHead = {}, baseURL = '/'): Nuxt {
  return {
    options: {
      _layers: [{ config: { rootDir, dir: { public: 'public' } } }],
      app: { baseURL, head },
    },
  } as unknown as Nuxt
}

describe('icon asset conventions', () => {
  it.each([
    ['favicon.ico', 'icon'],
    ['favicon.svg', 'icon'],
    ['favicon-dark.svg', 'icon'],
    ['favicon.light.png', 'icon'],
    ['icon.ico', 'icon'],
    ['icon.dark.png', 'icon'],
    ['icon-dark.png', 'icon'],
    ['1.icon.png', 'icon'],
    ['apple-touch-icon.png', 'apple-touch-icon'],
  ] as const)('classifies %s as %s', (filename, role) => {
    expect(classifyIconFilename(filename)).toBe(role)
  })

  it('parses link rel tokens case-insensitively', () => {
    expect(getIconRel('alternate ICON')).toBe('icon')
    expect(getIconRel('APPLE-TOUCH-ICON')).toBe('apple-touch-icon')
  })

  it('ignores unrelated image files', () => {
    expect(classifyIconFilename('article.png')).toBeUndefined()
  })

  it('extracts complete color mode pairs from static icon links', () => {
    const result = partitionColorModeIconLinks([
      { rel: 'icon', href: '/favicon-dark.svg', media: '(prefers-color-scheme: dark)' },
      { rel: 'icon', href: '/favicon-light.svg', media: '(prefers-color-scheme: light)' },
      { rel: 'apple-touch-icon', href: '/touch-dark.png', media: '(prefers-color-scheme: dark)' },
      { rel: 'apple-touch-icon', href: '/touch-light.png', media: '(prefers-color-scheme: light)' },
      { rel: 'icon', href: '/fallback.ico' },
    ])

    expect(result).toEqual({
      _tag: 'ReactiveIconLinks',
      links: [
        { rel: 'icon', href: '/fallback.ico' },
      ],
      icons: {
        dark: [
          { rel: 'icon', href: '/favicon-dark.svg' },
          { rel: 'apple-touch-icon', href: '/touch-dark.png' },
        ],
        light: [
          { rel: 'icon', href: '/favicon-light.svg' },
          { rel: 'apple-touch-icon', href: '/touch-light.png' },
        ],
      },
    })
  })

  it('keeps incomplete color mode pairs as media links', () => {
    const links: Link[] = [
      { rel: 'icon', href: '/favicon-dark.svg', media: '(prefers-color-scheme: dark)' },
    ]

    expect(partitionColorModeIconLinks(links)).toEqual({
      _tag: 'StaticIconLinks',
      links,
    })
  })

  it('writes every supplied PNG size into the ICO directory', () => {
    const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8TqNwAAAABJRU5ErkJggg==', 'base64')
    const ico = pngToIco([
      { buffer: onePixelPng, width: 16, height: 16 },
      { buffer: onePixelPng, width: 32, height: 32 },
      { buffer: onePixelPng, width: 48, height: 48 },
    ])

    expect(imageSize(ico).images).toEqual([
      expect.objectContaining({ width: 16, height: 16 }),
      expect.objectContaining({ width: 32, height: 32 }),
      expect.objectContaining({ width: 48, height: 48 }),
    ])
  })
})

describe('public icon tags', () => {
  it('always links favicon.ico with its packed sizes', async () => {
    const nuxt = createNuxt(resolve('../../test/fixtures/basic'))

    await generateTagsFromPublicFiles(nuxt)

    expect(nuxt.options.app.head.link).toContainEqual({
      rel: 'icon',
      type: 'image/vnd.microsoft.icon',
      href: '/favicon.ico',
      sizes: '16x16 32x32 48x48',
    })
  })

  it('normalizes invalid sizes on a local manually configured icon', async () => {
    const nuxt = createNuxt(resolve('../../test/fixtures/basic'), {
      link: [{ rel: 'ICON', href: '/favicon.ico', sizes: 'any' } as unknown as Link],
    })

    const result = await generateTagsFromPublicFiles(nuxt)

    expect(nuxt.options.app.head.link).toContainEqual({
      rel: 'ICON',
      type: 'image/vnd.microsoft.icon',
      href: '/favicon.ico',
      sizes: '16x16 32x32 48x48',
    })
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      _tag: 'IconSizesNormalized',
      href: '/favicon.ico',
    }))
  })

  it('normalizes local manual icon hrefs to baseURL', async () => {
    const nuxt = createNuxt(resolve('../../test/fixtures/basic'), {
      link: [{ rel: 'icon', href: '/favicon.ico', sizes: '48x48' }],
    }, '/docs')

    const result = await generateTagsFromPublicFiles(nuxt)

    expect(nuxt.options.app.head.link).toContainEqual(expect.objectContaining({
      href: '/docs/favicon.ico',
      sizes: '48x48',
    }))
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      _tag: 'IconHrefNormalized',
      configured: '/favicon.ico',
      resolved: '/docs/favicon.ico',
    }))
  })

  it('infers regular and Apple icons independently', async () => {
    const nuxt = createNuxt(resolve('../../playground'), {
      link: [{ rel: 'icon', href: '/custom.svg', sizes: 'any' }],
    })

    await generateTagsFromPublicFiles(nuxt)

    expect(nuxt.options.app.head.link).toContainEqual(expect.objectContaining({
      rel: 'apple-touch-icon',
      href: '/apple-touch-icon.png',
      sizes: '180x180',
    }))
    expect(nuxt.options.app.head.link).not.toContainEqual(expect.objectContaining({
      rel: 'icon',
      href: '/favicon.ico',
    }))
  })
})
