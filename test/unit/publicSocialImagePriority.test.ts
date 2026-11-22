import type { NuxtConfig } from '@nuxt/schema'
import type { ModuleOptions } from '../../src/module'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { loadNuxt } from '@nuxt/kit'
import { load } from 'cheerio'
import ts from 'typescript'
import { createHead } from 'unhead/server'
import { expect, it } from 'vitest'

const configuredImage = 'https://example.com/configured.png'
type SeoConfig = NuxtConfig & { seo?: Partial<ModuleOptions> }

const authoredConfigs: [string, SeoConfig][] = [
  ['seo.meta', { seo: { meta: { ogImage: configuredImage, twitterImage: configuredImage } } }],
  ['app.seoMeta', { app: { seoMeta: { ogImage: configuredImage, twitterImage: configuredImage } } }],
  ['app.head.seoMeta', { app: { head: { seoMeta: { ogImage: configuredImage, twitterImage: configuredImage } } } }],
  ['app.head.meta', { app: { head: { meta: [
    { property: 'og:image', content: configuredImage },
    { name: 'twitter:image', content: configuredImage },
  ] } } }],
  ['public fallback', {}],
]

it.each(authoredConfigs)('keeps %s images above public fallbacks with server-only defaults', async (_name, config) => {
  const buildDir = await mkdtemp(join(tmpdir(), 'seo-public-image-priority-'))
  const overrides: SeoConfig = {
    ...config,
    buildDir,
    _prepare: true,
    devtools: { enabled: false },
    seo: { ...config.seo, serverOnlyCrawlerDefaults: true },
  }
  const nuxt = await loadNuxt({
    cwd: fileURLToPath(new URL('../fixtures/social-tags', import.meta.url)),
    dev: false,
    overrides,
  })
  try {
    const head = createHead({ disableDefaults: true })
    head.push(nuxt.options.app.head)
    // Execute the generated server plugin with Nuxt's plugin wrapper as an identity function.
    // Unhead receives the same static head and plugin pushes as an SSR request.
    const template = nuxt.options.build.templates.find(t => typeof t !== 'string' && t.filename === 'seo-utils-public-social-images.server.ts')
    if (template && typeof template !== 'string' && template.getContents) {
      const source = await template.getContents({ nuxt, app: nuxt.apps.default!, options: nuxt.options })
      const exports: { default?: (app: unknown) => void } = {}
      runInNewContext(ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      }).outputText, {
        exports,
        require: (id: string) => {
          if (id === 'nuxt/app')
            return { defineNuxtPlugin: (plugin: unknown) => plugin }
          throw new Error(`Unexpected plugin dependency: ${id}`)
        },
      })
      exports.default!({ ssrContext: { head } })
    }

    const html = load(head.render().headTags)
    const expectedImage = _name === 'public fallback' ? 'og-image.png' : configuredImage
    expect(html('meta[property="og:image"]').attr('content')).toBe(expectedImage)
    expect(html('meta[name="twitter:image"]').attr('content')).toBe(expectedImage)

    head.push({ meta: [{ property: 'og:image', content: 'https://example.com/page.png' }] })
    expect(load(head.render().headTags)('meta[property="og:image"]').attr('content')).toBe('https://example.com/page.png')
  }
  finally {
    await nuxt.close()
    await rm(buildDir, { recursive: true, force: true })
  }
}, 60_000)
