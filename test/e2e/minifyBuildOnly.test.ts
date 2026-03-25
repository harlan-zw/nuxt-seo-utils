import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { parse } from 'ultrahtml'
import { querySelectorAll } from 'ultrahtml/selector'
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
          { innerHTML: 'var   buildOnlyScript   =   true  ;  // should be minified at build time' },
        ],
        style: [
          { innerHTML: '.build-only  {  color:  blue;  /* build comment */  display:  flex  }' },
        ],
      },
    },
    // @ts-expect-error module config key
    seo: {
      minify: { build: true, runtime: false },
      treeShakeUseSeoMeta: false,
    },
  },
})

function getInlineScripts(ast: ReturnType<typeof parse>) {
  return querySelectorAll(ast, 'script')
    .filter(el => !el.attributes.src)
}

function getScriptContent(el: { children?: { value?: string }[] }) {
  return el?.children?.[0]?.value ?? ''
}

function getStyleContent(el: { children?: { value?: string }[] }) {
  return el?.children?.[0]?.value ?? ''
}

describe('minify build-only (runtime disabled)', () => {
  it('minifies static head scripts at build time', async () => {
    const html = await $fetch<string>('/')
    const ast = parse(html)
    const scripts = getInlineScripts(ast)
    const allContent = scripts.map(el => getScriptContent(el)).join('')

    expect(allContent).toContain('buildOnlyScript')
    expect(allContent).not.toContain('// should be minified at build time')
    expect(allContent).not.toContain('var   buildOnlyScript')
  }, 30_000)

  it('minifies static head styles at build time', async () => {
    const html = await $fetch<string>('/')
    const ast = parse(html)
    const styles = querySelectorAll(ast, 'style')
    const allContent = styles.map(el => getStyleContent(el)).join('')

    expect(allContent).toContain('.build-only')
    expect(allContent).not.toContain('/* build comment */')
  }, 30_000)

  it('preserves non-JS script types', async () => {
    const html = await $fetch<string>('/')
    const ast = parse(html)
    const dataScripts = querySelectorAll(ast, 'script')
      .filter(el => /^application\/(?:ld\+)?json$/.test(el.attributes.type ?? ''))

    for (const el of dataScripts) {
      const content = getScriptContent(el)
      if (content) {
        expect(() => JSON.parse(content)).not.toThrow()
      }
    }
  }, 30_000)
})
