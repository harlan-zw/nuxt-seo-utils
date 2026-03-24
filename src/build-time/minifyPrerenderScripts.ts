import { useNuxt } from '@nuxt/kit'

const INLINE_SCRIPT_RE = /<script(?![^>]+\bsrc\b)([^>]*)>([\s\S]*?)<\/script>/gi
const TYPE_NON_JS_RE = /\btype\s*=\s*["'](?!text\/javascript|module|application\/javascript)[^"']*["']/i

export default function minifyPrerenderScripts() {
  const nuxt = useNuxt()
  nuxt.hooks.hook('nitro:init', (nitro) => {
    nitro.hooks.hook('prerender:generate', async (route) => {
      if (!route.contents || !route.contentType?.includes('html'))
        return

      let esbuild: typeof import('esbuild') | undefined
      try {
        esbuild = await import('esbuild')
      }
      catch {
        return
      }

      route.contents = await replaceAsync(
        route.contents,
        new RegExp(INLINE_SCRIPT_RE.source, INLINE_SCRIPT_RE.flags),
        async (fullMatch: string, attrs: string, content: string) => {
          if (TYPE_NON_JS_RE.test(attrs))
            return fullMatch
          if (!content || content.trim().length < 20)
            return fullMatch
          try {
            const result = await esbuild!.transform(content, {
              minify: true,
              loader: 'js',
            })
            const minified = result.code.trim()
            if (minified.length < content.length)
              return `<script${attrs}>${minified}</script>`
          }
          catch {}
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
  let m: RegExpExecArray | null
  for (m = re.exec(str); m !== null; m = re.exec(str))
    matches.push({ match: m, replacement: asyncFn(...m) })

  const replacements = await Promise.all(matches.map(m => m.replacement))
  let result = str
  // replace in reverse order to preserve indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const { match } = matches[i]
    result = result.slice(0, match.index) + replacements[i] + result.slice(match.index + match[0].length)
  }
  return result
}
