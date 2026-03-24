import { useNuxt } from '@nuxt/kit'

const INLINE_SCRIPT_RE = /<script(?![^>]+\bsrc\b)([^>]*)>([\s\S]*?)<\/script>/gi
const INLINE_STYLE_RE = /<style([^>]*)>([\s\S]*?)<\/style>/gi
const TYPE_NON_JS_RE = /\btype\s*=\s*["'](?!text\/javascript|module|application\/javascript)[^"']*["']/i
const NON_JS_TYPES = new Set(['application/json', 'application/ld+json', 'speculationrules', 'importmap'])

async function minifyJSWithEsbuild(code: string): Promise<string | null> {
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

async function minifyCSSWithLightningCSS(code: string): Promise<string | null> {
  try {
    const lightningcss = await import('lightningcss')
    const result = lightningcss.transform({
      filename: 'inline.css',
      code: new TextEncoder().encode(code),
      minify: true,
    })
    return new TextDecoder().decode(result.code).trim()
  }
  catch {
    return null
  }
}

export default function minifyPrerender() {
  const nuxt = useNuxt()

  // minify static scripts and styles in nuxt.options.app.head at build time
  nuxt.hooks.hook('app:resolve', async () => {
    const head = nuxt.options.app.head
    const promises: Promise<void>[] = []

    if (head.script?.length) {
      for (const script of head.script) {
        if (typeof script === 'string')
          continue
        const content = script.innerHTML || script.textContent
        if (!content || content.trim().length < 20)
          continue
        if (script.type && NON_JS_TYPES.has(script.type))
          continue
        promises.push(minifyJSWithEsbuild(content).then((minified) => {
          if (minified && minified.length < content.length) {
            if (script.innerHTML)
              script.innerHTML = minified
            else if (script.textContent)
              script.textContent = minified
          }
        }))
      }
    }

    if (head.style?.length) {
      for (const style of head.style) {
        if (typeof style === 'string')
          continue
        const content = style.innerHTML || style.textContent
        if (!content || content.trim().length < 20)
          continue
        promises.push(minifyCSSWithLightningCSS(content).then((minified) => {
          if (minified && minified.length < content.length) {
            if (style.innerHTML)
              style.innerHTML = minified
            else if (style.textContent)
              style.textContent = minified
          }
        }))
      }
    }

    await Promise.all(promises)
  })

  // minify inline scripts and styles in prerendered route HTML
  nuxt.hooks.hook('nitro:init', (nitro) => {
    nitro.hooks.hook('prerender:generate', async (route) => {
      if (!route.contents || !route.contentType?.includes('html'))
        return

      // minify inline scripts with esbuild
      route.contents = await replaceAsync(
        route.contents,
        new RegExp(INLINE_SCRIPT_RE.source, INLINE_SCRIPT_RE.flags),
        async (fullMatch: string, attrs: string, content: string) => {
          if (TYPE_NON_JS_RE.test(attrs))
            return fullMatch
          if (!content || content.trim().length < 20)
            return fullMatch
          const minified = await minifyJSWithEsbuild(content)
          if (minified && minified.length < content.length)
            return `<script${attrs}>${minified}</script>`
          return fullMatch
        },
      )

      // minify inline styles with lightningcss
      route.contents = await replaceAsync(
        route.contents,
        new RegExp(INLINE_STYLE_RE.source, INLINE_STYLE_RE.flags),
        async (fullMatch: string, attrs: string, content: string) => {
          if (!content || content.trim().length < 20)
            return fullMatch
          const minified = await minifyCSSWithLightningCSS(content)
          if (minified && minified.length < content.length)
            return `<style${attrs}>${minified}</style>`
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
