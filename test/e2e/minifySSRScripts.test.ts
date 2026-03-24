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
    app: {
      head: {
        script: [
          { innerHTML: 'var   testMinifyScript   =   true  ;  // should be minified' },
        ],
        style: [
          { innerHTML: '.test-minify  {  color:  red;  /* comment */  display:  block  }' },
        ],
      },
    },
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
    const scripts = html.match(/<script(?![^>]+\bsrc\b)[^>]*>([\s\S]*?)<\/script\s*>/gi) || []
    const jsScripts = scripts.filter((s) => {
      return !s.match(/type\s*=\s*["'](?!text\/javascript|module|application\/javascript)[^"']*["']/i)
    })
    let foundLargeScript = false
    for (const script of jsScripts) {
      const content = script.match(/<script[^>]*>([\s\S]*?)<\/script\s*>/i)?.[1]
      if (!content || content.trim().length < 20)
        continue
      foundLargeScript = true
      // minified scripts should not have multiple consecutive newlines
      expect(content).not.toMatch(/\n\s*\n/)
    }
    expect(foundLargeScript).toBe(true)
  }, 30_000)

  it('minifies inline style tags in SSR response', async () => {
    const html = await $fetch<string>('/')
    // the test style we injected should be minified
    expect(html).toContain('.test-minify{color:red;display:block}')
    // the comment should be removed
    expect(html).not.toContain('/* comment */')
  }, 30_000)

  it('minifies static head scripts', async () => {
    const html = await $fetch<string>('/')
    // the test script we injected via app.head should be minified
    expect(html).toContain('testMinifyScript')
    // comments and extra whitespace should be removed
    expect(html).not.toContain('// should be minified')
    expect(html).not.toContain('var   testMinifyScript')
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

  it('does not break page rendering', async () => {
    const html = await $fetch<string>('/')
    // page should still render correctly
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
    expect(html).toContain('<body')
  }, 30_000)
})
