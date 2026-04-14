import { defineNitroPlugin } from 'nitropack/runtime'
import { minifyCSS, minifyJS, minifyJSON } from '../../shared/minify'

const INLINE_SCRIPT_RE = /<script(?![^>]+\bsrc\b)([^>]*)>([\s\S]*?)<\/script\s*>/gi
const INLINE_STYLE_RE = /<style([^>]*)>([\s\S]*?)<\/style\s*>/gi
const TYPE_ATTR_RE = /\btype\s*=\s*["']([^"']*)["']/i
const JSON_TYPES = new Set(['application/json', 'application/ld+json'])
const SKIP_JS_TYPES = new Set(['application/json', 'application/ld+json', 'speculationrules', 'importmap'])

function minifyChunk(chunk: string): string {
  let out = chunk.replace(INLINE_SCRIPT_RE, (full, attrs: string, content: string) => {
    if (!content)
      return full
    const type = TYPE_ATTR_RE.exec(attrs)?.[1]
    if (type && JSON_TYPES.has(type)) {
      try {
        const m = minifyJSON(content)
        return m.length < content.length ? `<script${attrs}>${m}</script>` : full
      }
      catch {
        return full
      }
    }
    if (type && SKIP_JS_TYPES.has(type))
      return full
    try {
      const m = minifyJS(content)
      return m.length < content.length ? `<script${attrs}>${m}</script>` : full
    }
    catch {
      return full
    }
  })
  out = out.replace(INLINE_STYLE_RE, (full, attrs: string, content: string) => {
    if (!content)
      return full
    try {
      const m = minifyCSS(content)
      return m.length < content.length ? `<style${attrs}>${m}</style>` : full
    }
    catch {
      return full
    }
  })
  return out
}

export default defineNitroPlugin((nitroApp) => {
  if (!import.meta.prerender)
    return
  nitroApp.hooks.hook('render:html', (html) => {
    for (const arr of [html.head, html.bodyPrepend, html.body, html.bodyAppend]) {
      for (let i = 0; i < arr.length; i++)
        arr[i] = minifyChunk(arr[i]!)
    }
  })
})
