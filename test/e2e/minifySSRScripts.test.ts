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
      minifySSRScripts: { runtime: true },
      treeShakeUseSeoMeta: false,
    },
  },
})

describe('minifySSRScripts', () => {
  it('minifies inline script tags in SSR response', async () => {
    const html = await $fetch<string>('/')
    // inline scripts should not contain unnecessary whitespace/newlines
    const scripts = html.match(/<script(?![^>]+\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi) || []
    const jsScripts = scripts.filter((s) => {
      // exclude non-JS types like application/json, importmap
      return !s.match(/type\s*=\s*["'](?!text\/javascript|module|application\/javascript)[^"']*["']/i)
    })
    for (const script of jsScripts) {
      const content = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1]
      if (!content || content.trim().length < 20)
        continue
      // minified scripts should not have multiple consecutive newlines
      expect(content).not.toMatch(/\n\s*\n/)
    }
  }, 30_000)

  it('preserves non-JS script types like application/json', async () => {
    const html = await $fetch<string>('/')
    // ld+json and other data scripts should remain intact
    const dataScripts = html.match(/<script[^>]*type\s*=\s*["']application\/(?:ld\+)?json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
    for (const script of dataScripts) {
      const content = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1]
      if (content) {
        // should still be valid JSON
        expect(() => JSON.parse(content)).not.toThrow()
      }
    }
  }, 30_000)
})
