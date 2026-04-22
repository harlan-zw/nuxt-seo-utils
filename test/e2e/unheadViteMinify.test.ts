import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { parse } from 'ultrahtml'
import { querySelectorAll } from 'ultrahtml/selector'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/basic'),
  nuxtConfig: {
    modules: [
      resolve('../../src/module'),
    ],
    // @ts-expect-error module config key
    seo: {
      treeShakeUseSeoMeta: true,
    },
  },
})

function textOf(el: any) {
  return el?.children?.[0]?.value ?? ''
}

describe('@unhead/vue/vite minify transform', () => {
  it('minifies inline useHead script innerHTML at build time', async () => {
    const html = await $fetch<string>('/unhead-minify')
    const ast = parse(html)
    const content = querySelectorAll(ast, 'script')
      .filter(el => !el.attributes.src)
      .map(textOf)
      .join('')

    expect(content).toContain('unheadMinifyTarget')
    expect(content).not.toContain('// should be minified')
    expect(content).not.toMatch(/var\s{3,}unheadMinifyTarget/)
  }, 60_000)

  it('minifies inline useHead style innerHTML at build time', async () => {
    const html = await $fetch<string>('/unhead-minify')
    const ast = parse(html)
    const content = querySelectorAll(ast, 'style').map(textOf).join('')

    expect(content).toContain('.unhead-minify-target')
    expect(content).not.toContain('/* unhead comment */')
  }, 60_000)

  it('does not inject ValidatePlugin runtime in test mode', async () => {
    const html = await $fetch<string>('/unhead-minify')
    expect(html).not.toContain('__unhead_validate')
  }, 60_000)
})
