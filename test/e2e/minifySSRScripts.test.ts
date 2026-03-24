import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/basic'),
  nuxtConfig: {
    site: {
      name: 'My Site',
      url: 'https://example.com',
    },
    modules: [
      resolve('../../src/module'),
    ],
    // @ts-expect-error module config key
    seo: {
      minify: { runtime: true },
      treeShakeUseSeoMeta: false,
    },
  },
})

describe('minify', () => {
  it('minifies inline script tags in SSR response', async () => {
    const html = await $fetch<string>('/')
    const scripts = html.match(/<script(?![^>]+\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi) || []
    const jsScripts = scripts.filter((s) => {
      return !s.match(/type\s*=\s*["'](?!text\/javascript|module|application\/javascript)[^"']*["']/i)
    })
    for (const script of jsScripts) {
      const content = script.match(/<script[^>]*>([\s\S]*?)<\/script\b[^>]*>/i)?.[1]
      if (!content || content.trim().length < 20)
        continue
      // minified scripts should not have multiple consecutive newlines
      expect(content).not.toMatch(/\n\s*\n/)
    }
  }, 30_000)

  it('preserves non-JS script types like application/json', async () => {
    const html = await $fetch<string>('/')
    const dataScripts = html.match(/<script[^>]*type\s*=\s*["']application\/(?:ld\+)?json["'][^>]*>([\s\S]*?)<\/script\s*>/gi) || []
    for (const script of dataScripts) {
      const content = script.match(/<script[^>]*>([\s\S]*?)<\/script\s*>/i)?.[1]
      if (content) {
        expect(() => JSON.parse(content)).not.toThrow()
      }
    }
  }, 30_000)
})
