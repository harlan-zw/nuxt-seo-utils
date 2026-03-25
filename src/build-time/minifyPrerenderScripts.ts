import { useLogger, useNuxt } from '@nuxt/kit'

const INLINE_SCRIPT_RE = /<script(?![^>]+\bsrc\b)([^>]*)>([\s\S]*?)<\/script\s*>/gi
const INLINE_STYLE_RE = /<style([^>]*)>([\s\S]*?)<\/style\s*>/gi
const TYPE_ATTR_RE = /\btype\s*=\s*["']([^"']*)["']/i
const JSON_TYPES = new Set(['application/json', 'application/ld+json'])
const SKIP_JS_TYPES = new Set(['application/json', 'application/ld+json', 'speculationrules', 'importmap'])

const logger = useLogger('nuxt-seo-utils')

async function minifyJSBuildTime(code: string): Promise<string | null> {
  // try rolldown first (Vite 8+)
  try {
    const rolldownPath = 'rolldown/experimental'
    const { minify } = await import(/* @vite-ignore */ rolldownPath) as { minify: (filename: string, code: string) => Promise<{ code: string }> }
    const result = await minify('inline.js', code)
    return result.code.trim()
  }
  catch {}
  // fallback to esbuild (Vite 7)
  try {
    const esbuild = await import('esbuild')
    const result = await esbuild.transform(code, {
      minify: true,
      loader: 'js',
    })
    return result.code.trim()
  }
  catch {}
  logger.debug('Build-time JS minification skipped: neither rolldown nor esbuild is available. Install one as a dependency to enable it.')
  return null
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
    logger.debug('Build-time CSS minification skipped: lightningcss is not available. Install it as a dependency to enable it.')
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
        const content = String(script.innerHTML || script.textContent || '')
        if (!content)
          continue
        const setContent = (val: string) => {
          if (script.innerHTML)
            script.innerHTML = val
          else if (script.textContent)
            script.textContent = val
        }
        if (script.type && JSON_TYPES.has(script.type)) {
          try {
            const minified = JSON.stringify(JSON.parse(content))
            if (minified.length < content.length)
              setContent(minified)
          }
          catch {}
          continue
        }
        if (script.type && SKIP_JS_TYPES.has(script.type))
          continue
        promises.push(minifyJSBuildTime(content).then((minified) => {
          if (minified && minified.length < content.length)
            setContent(minified)
        }))
      }
    }

    if (head.style?.length) {
      for (const style of head.style) {
        if (typeof style === 'string')
          continue
        const content = String(style.innerHTML || style.textContent || '')
        if (!content)
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

      // minify inline scripts
      route.contents = await replaceAsync(
        route.contents,
        new RegExp(INLINE_SCRIPT_RE.source, INLINE_SCRIPT_RE.flags),
        async (fullMatch: string, attrs: string, content: string) => {
          if (!content)
            return fullMatch
          const typeMatch = TYPE_ATTR_RE.exec(attrs)
          const type = typeMatch?.[1]
          if (type && JSON_TYPES.has(type)) {
            try {
              const minified = JSON.stringify(JSON.parse(content))
              if (minified.length < content.length)
                return `<script${attrs}>${minified}</script>`
            }
            catch {}
            return fullMatch
          }
          if (type && SKIP_JS_TYPES.has(type))
            return fullMatch
          const minified = await minifyJSBuildTime(content)
          if (minified && minified.length < content.length)
            return `<script${attrs}>${minified}</script>`
          return fullMatch
        },
      )

      // minify inline styles
      route.contents = await replaceAsync(
        route.contents,
        new RegExp(INLINE_STYLE_RE.source, INLINE_STYLE_RE.flags),
        async (fullMatch: string, attrs: string, content: string) => {
          if (!content)
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
    const { match } = matches[i]!
    result = result.slice(0, match.index) + replacements[i] + result.slice(match.index + match[0].length)
  }
  return result
}
