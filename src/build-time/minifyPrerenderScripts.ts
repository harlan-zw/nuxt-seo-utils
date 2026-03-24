import { useNuxt } from '@nuxt/kit'

const INLINE_SCRIPT_RE = /<script(?![^>]+\bsrc\b)([^>]*)>([\s\S]*?)<\/script>/gi
const TYPE_NON_JS_RE = /\btype\s*=\s*["'](?!text\/javascript|module|application\/javascript)[^"']*["']/i
const NON_JS_TYPES = new Set(['application/json', 'application/ld+json', 'speculationrules', 'importmap'])

async function minifyWithEsbuild(code: string): Promise<string | null> {
  try {
    const esbuild = await import('esbuild')
    const result = await esbuild.transform(code, {
      minify: true,
      loader: 'js',
    })
    return result.code.trim()
  }
  catch {
    return null
  }
}

export default function minifyPrerenderScripts() {
  const nuxt = useNuxt()

  // minify static scripts in nuxt.options.app.head at build time
  nuxt.hooks.hook('app:resolve', async () => {
    const head = nuxt.options.app.head
    if (!head.script?.length)
      return

    await Promise.all(head.script.map(async (script) => {
      if (typeof script === 'string')
        return
      const content = script.innerHTML || script.textContent
      if (!content || content.trim().length < 20)
        return
      // skip non-JS types
      if (script.type && NON_JS_TYPES.has(script.type))
        return

      const minified = await minifyWithEsbuild(content)
      if (minified && minified.length < content.length) {
        if (script.innerHTML)
          script.innerHTML = minified
        else if (script.textContent)
          script.textContent = minified
      }
    }))
  })

  // minify inline scripts in prerendered route HTML
  nuxt.hooks.hook('nitro:init', (nitro) => {
    nitro.hooks.hook('prerender:generate', async (route) => {
      if (!route.contents || !route.contentType?.includes('html'))
        return

      route.contents = await replaceAsync(
        route.contents,
        new RegExp(INLINE_SCRIPT_RE.source, INLINE_SCRIPT_RE.flags),
        async (fullMatch: string, attrs: string, content: string) => {
          if (TYPE_NON_JS_RE.test(attrs))
            return fullMatch
          if (!content || content.trim().length < 20)
            return fullMatch

          const minified = await minifyWithEsbuild(content)
          if (minified && minified.length < content.length)
            return `<script${attrs}>${minified}</script>`
          return fullMatch
        },
      )
    })
  })
}

async function replaceAsync(
  str: string,
  regex: RegExp,
  asyncFn: (...args: string[]) => Promise<string>,
): Promise<string> {
  const matches: Array<{ match: RegExpExecArray, replacement: Promise<string> }> = []
  const re = new RegExp(regex.source, regex.flags)
  for (let m = re.exec(str); m !== null; m = re.exec(str))
    matches.push({ match: m, replacement: asyncFn(...m) })

  const replacements = await Promise.all(matches.map(m => m.replacement))
  let result = str
  for (let i = matches.length - 1; i >= 0; i--) {
    const { match } = matches[i]
    result = result.slice(0, match.index) + replacements[i] + result.slice(match.index + match[0].length)
  }
  return result
}
