import { describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import minifyHtml from '../../src/runtime/server/plugins/minifyHtml'

interface RenderedHtml {
  head: string[]
  bodyPrepend: string[]
  body: string[]
  bodyAppend: string[]
}

type HtmlHook = (html: RenderedHtml) => void

vi.mock('#nuxtseo/nitro', () => ({
  defineNitroPlugin: (plugin: unknown) => plugin,
}))

function renderHtml(html: RenderedHtml) {
  const hooks: HtmlHook[] = []
  const plugin = minifyHtml as unknown as (app: { hooks: { hook: (name: string, callback: HtmlHook) => void } }) => void
  plugin({ hooks: { hook: (_name, callback) => hooks.push(callback) } })
  for (const hook of hooks)
    hook(html)
  return html
}

describe('prerender HTML minification', () => {
  it('preserves Vue-rendered style and JSON text inside the app', async () => {
    const app = await renderToString(h('div', [
      h('style', 'html pre.shiki code .token, html code.shiki .token { color: red; }'),
      h('script', { type: 'application/json', innerHTML: '{ "value": "rendered by Vue" }' }),
    ]))
    const html = renderHtml({ head: [], bodyPrepend: [], body: [app], bodyAppend: [] })

    expect(html.body).toEqual([app])
  })

  it('keeps escaped JSON text escaped, so it cannot end its script', () => {
    const json = String.raw`<script type="application/ld+json">{ "text": "\u003C/script>\u003Cscript>alert(1)" }</script>`
    const html = renderHtml({ head: [json], bodyPrepend: [], body: [], bodyAppend: [] })

    expect(html.head).toEqual([
      String.raw`<script type="application/ld+json">{"text":"\u003C/script>\u003Cscript>alert(1)"}</script>`,
    ])
  })

  it('still minifies managed tags outside the app', () => {
    const style = '<style>.head  { color: red; }</style>'
    const json = '<script type="application/ld+json">{ "value": true }</script>'
    const html = renderHtml({ head: [style, json], bodyPrepend: [style], body: [], bodyAppend: [json] })

    expect(html.head).toEqual([
      '<style>.head{color:red}</style>',
      '<script type="application/ld+json">{"value":true}</script>',
    ])
    expect(html.bodyPrepend).toEqual(['<style>.head{color:red}</style>'])
    expect(html.bodyAppend).toEqual(['<script type="application/ld+json">{"value":true}</script>'])
  })
})
