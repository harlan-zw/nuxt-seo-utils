import { resolve } from 'node:path'
import { $fetch, setup } from '@nuxt/test-utils'
import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

// Guards Unhead v2 compatibility. The module imports @unhead/vue directly
// (`/plugins`, `/utils`, `/vite`) and registers InferSeoMetaPlugin +
// TemplateParamsPlugin at runtime. The main suite runs on the v3 stack, so this
// fixture installs a v2 host (Nuxt 4.2 / @unhead/vue@2 / unhead@2) and asserts a
// successful render proves those imports resolve and both plugins still run.
await setup({
  rootDir: resolve(import.meta.dirname),
  server: true,
  browser: false,
})

describe('unhead v2 compatibility', () => {
  it('renders inferred og/twitter tags and resolved template params', async () => {
    const html = await $fetch('/') as string
    const $ = load(html)

    const meta = (selector: string) => $(`meta[${selector}]`).attr('content')

    // InferSeoMetaPlugin: og:title / og:description inferred from useSeoMeta
    expect(meta('property="og:title"')).toContain('Hello v2')
    expect(meta('property="og:description"')).toBe('inferred description on the unhead v2 stack')
    // InferSeoMetaPlugin: twitter card is synthesised
    expect(meta('name="twitter:card"')).toBe('summary_large_image')

    // TemplateParamsPlugin: the module's '%s %separator %siteName' titleTemplate
    // resolves %siteName from the site config templateParams
    const title = $('title').text()
    expect(title).toContain('Hello v2')
    expect(title).toContain('Compat v2')
  })
})
