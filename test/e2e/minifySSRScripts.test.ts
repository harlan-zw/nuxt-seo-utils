import { runInNewContext } from 'node:vm'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { parse } from 'ultrahtml'
import { querySelector, querySelectorAll } from 'ultrahtml/selector'
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
    seo: {
      minify: { runtime: true },
      treeShakeUseSeoMeta: false,
    },
  },
})

function getInlineScripts(ast: ReturnType<typeof parse>) {
  return querySelectorAll(ast, 'script')
    .filter(el => !el.attributes.src)
}

function getScriptContent(el: ReturnType<typeof querySelector>) {
  return el?.children?.[0]?.value ?? ''
}

function getStyleContent(el: ReturnType<typeof querySelector>) {
  return el?.children?.[0]?.value ?? ''
}

describe('minify', () => {
  it('preserves dynamic JavaScript semantics and custom script types', async () => {
    const ast = parse(await $fetch<string>('/script-semantics'))
    const content = getScriptContent(querySelector(ast, '#script-semantics'))
    const context: Record<string, any> = {}
    runInNewContext(content, context)
    expect(context.scriptSemantics).toMatchObject({ matches: true, asi: undefined })
    expect(getScriptContent(querySelector(ast, '#custom-script'))).toBe('  <div> template // literal </div>  ')
    expect(JSON.parse(getScriptContent(querySelector(ast, '#script-json')))).toEqual({ value: 'https://example.com' })
    expect(JSON.parse(getScriptContent(querySelector(ast, '#script-importmap')))).toEqual({ imports: { example: '/example.js' } })
  }, 30_000)

  it('minifies inline style tags in SSR response', async () => {
    const html = await $fetch<string>('/')
    const ast = parse(html)
    const styles = querySelectorAll(ast, 'style')
    const allStyleContent = styles.map(el => getStyleContent(el)).join('')

    expect(allStyleContent).toContain('.test-minify{color:red;display:block}')
    expect(allStyleContent).not.toContain('/* comment */')
  }, 30_000)

  it('minifies static head scripts', async () => {
    const html = await $fetch<string>('/')
    const ast = parse(html)
    const scripts = getInlineScripts(ast)
    const allScriptContent = scripts.map(el => getScriptContent(el)).join('')

    expect(allScriptContent).toContain('testMinifyScript')
    expect(allScriptContent).not.toContain('// should be minified')
    expect(allScriptContent).not.toContain('var   testMinifyScript')
  }, 30_000)

  it('minifies JSON script types (strips whitespace)', async () => {
    const html = await $fetch<string>('/')
    const ast = parse(html)
    const dataScripts = querySelectorAll(ast, 'script')
      .filter(el => /^application\/(?:ld\+)?json$/.test(el.attributes.type ?? ''))

    for (const el of dataScripts) {
      const content = getScriptContent(el)
      if (content) {
        const parsed = JSON.parse(content)
        // should be valid JSON and already compact (no unnecessary whitespace)
        expect(content).toBe(JSON.stringify(parsed))
      }
    }
  }, 30_000)

  it('does not break page rendering', async () => {
    const html = await $fetch<string>('/')
    const ast = parse(html)
    expect(querySelector(ast, 'html')).toBeTruthy()
    expect(querySelector(ast, 'body')).toBeTruthy()
  }, 30_000)
})
