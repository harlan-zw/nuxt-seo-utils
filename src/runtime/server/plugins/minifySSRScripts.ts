import { defineNitroPlugin } from 'nitropack/runtime'
import { minifyJS } from '../../shared/minifyJS'

const INLINE_SCRIPT_RE = /<script(?![^>]+\bsrc\b)([^>]*)>([\s\S]*?)<\/script>/gi
const TYPE_NON_JS_RE = /\btype\s*=\s*["'](?!text\/javascript|module|application\/javascript)[^"']*["']/i

function minifyScriptsInHtml(html: string): string {
  return html.replace(
    new RegExp(INLINE_SCRIPT_RE.source, INLINE_SCRIPT_RE.flags),
    (fullMatch, attrs, content) => {
      if (TYPE_NON_JS_RE.test(attrs))
        return fullMatch
      if (!content || content.trim().length < 20)
        return fullMatch
      try {
        const minified = minifyJS(content)
        if (minified.length < content.length)
          return `<script${attrs}>${minified}</script>`
      }
      catch {}
      return fullMatch
    },
  )
}

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:html', (htmlContext) => {
    for (let i = 0; i < htmlContext.head.length; i++)
      htmlContext.head[i] = minifyScriptsInHtml(htmlContext.head[i])
    for (let i = 0; i < htmlContext.bodyAppend.length; i++)
      htmlContext.bodyAppend[i] = minifyScriptsInHtml(htmlContext.bodyAppend[i])
    for (let i = 0; i < htmlContext.bodyPrepend.length; i++)
      htmlContext.bodyPrepend[i] = minifyScriptsInHtml(htmlContext.bodyPrepend[i])
  })
})
