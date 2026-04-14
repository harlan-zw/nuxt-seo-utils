import { createHash } from 'node:crypto'
import { createResolver } from '@nuxt/kit'
import { $fetch, fetch, setup } from '@nuxt/test-utils/e2e'
import { parse } from 'ultrahtml'
import { querySelectorAll } from 'ultrahtml/selector'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/csp'),
  build: true,
  server: true,
  nuxtConfig: {
    nitro: {
      prerender: {
        routes: ['/'],
      },
    },
  },
})

function sha256Base64(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('base64')
}

function extractHashes(csp: string, directive: string): string[] {
  const part = csp.split(';').map(s => s.trim()).find(s => s === directive || s.startsWith(`${directive} `))
  if (!part)
    return []
  return Array.from(part.matchAll(/'sha256-([^']+)'/g), m => m[1]!)
}

describe('nuxt-security CSP hash compat with seo-utils minify', () => {
  it('cSP script-src hashes match the minified inline script contents', async () => {
    const res = await fetch('/')
    const body = await res.text()
    const csp = res.headers.get('content-security-policy')
    expect(csp, 'nuxt-security should set a CSP header on prerendered route').toBeTruthy()

    const scriptHashes = extractHashes(csp!, 'script-src')
    expect(scriptHashes.length, 'CSP should include at least one script hash').toBeGreaterThan(0)

    const ast = parse(body)
    const inlineScripts = querySelectorAll(ast, 'script')
      .filter(el => !el.attributes.src)
      .map(el => el.children?.[0]?.value ?? '')
      .filter(Boolean) as string[]

    for (const content of inlineScripts) {
      const hash = sha256Base64(content)
      expect(
        scriptHashes,
        `CSP script-src must contain hash for inline script:\n${content.slice(0, 120)}...`,
      ).toContain(hash)
    }
  }, 60_000)

  it('cSP style-src hashes match the minified inline style contents', async () => {
    const res = await fetch('/')
    const body = await res.text()
    const csp = res.headers.get('content-security-policy')!
    const styleHashes = extractHashes(csp, 'style-src')
    expect(styleHashes.length).toBeGreaterThan(0)

    const ast = parse(body)
    const inlineStyles = querySelectorAll(ast, 'style')
      .map(el => el.children?.[0]?.value ?? '')
      .filter(Boolean) as string[]

    for (const content of inlineStyles) {
      const hash = sha256Base64(content)
      expect(
        styleHashes,
        `CSP style-src must contain hash for inline style:\n${content.slice(0, 120)}...`,
      ).toContain(hash)
    }
  }, 60_000)

  it('inline content is actually minified (sanity check)', async () => {
    const html = await $fetch<string>('/')
    const ast = parse(html)
    const scripts = querySelectorAll(ast, 'script')
      .filter(el => !el.attributes.src)
      .map(el => el.children?.[0]?.value ?? '')
      .join('\n')
    expect(scripts).toContain('cspInlineScript')
    expect(scripts).not.toContain('var   cspInlineScript')
    expect(scripts).not.toContain('// inline script that must hash correctly')

    const styles = querySelectorAll(ast, 'style')
      .map(el => el.children?.[0]?.value ?? '')
      .join('\n')
    expect(styles).toContain('.csp-inline')
    expect(styles).not.toContain('/* block comment */')
  }, 60_000)
})
