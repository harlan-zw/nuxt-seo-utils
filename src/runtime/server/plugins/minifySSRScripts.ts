import { defineNitroPlugin } from 'nitropack/runtime'

const INLINE_SCRIPT_RE = /<script(?![^>]+\bsrc\b)([^>]*)>([\s\S]*?)<\/script>/gi
const TYPE_NON_JS_RE = /\btype\s*=\s*["'](?!text\/javascript|module|application\/javascript)[^"']*["']/i

let _minify: ((code: string) => Promise<string>) | null | undefined

async function resolveMinifier(): Promise<((code: string) => Promise<string>) | null> {
  // prefer esbuild as it's bundled with vite (always available in Nuxt)
  try {
    const esbuild = await import('esbuild')
    return async (code: string) => {
      const result = await esbuild.transform(code, {
        minify: true,
        loader: 'js',
      })
      return result.code.trim()
    }
  }
  catch {}
  // fallback to terser
  try {
    const terser = await import('terser')
    return async (code: string) => {
      const result = await terser.minify(code)
      return result.code?.trim() || code
    }
  }
  catch {}
  return null
}

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:response', async (response) => {
    if (typeof response.body !== 'string' || !response.body.includes('<script'))
      return

    if (_minify === undefined)
      _minify = await resolveMinifier()

    if (!_minify)
      return

    const minify = _minify
    const replacements: Array<{ original: string, replacement: string }> = []

    const re = new RegExp(INLINE_SCRIPT_RE.source, INLINE_SCRIPT_RE.flags)
    for (let match = re.exec(response.body); match !== null; match = re.exec(response.body)) {
      const [fullMatch, attrs, content] = match
      // skip non-JS types (e.g. application/ld+json, importmap)
      if (TYPE_NON_JS_RE.test(attrs))
        continue
      // skip empty or already tiny scripts
      if (!content || content.trim().length < 20)
        continue

      try {
        const minified = await minify(content)
        if (minified && minified.length < content.length) {
          replacements.push({
            original: fullMatch,
            replacement: `<script${attrs}>${minified}</script>`,
          })
        }
      }
      catch {
        // if minification fails for a script, skip it
      }
    }

    for (const { original, replacement } of replacements)
      response.body = response.body.replace(original, replacement)
  })
})
