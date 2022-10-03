import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { setup } from '@nuxt/test-utils'
import { $fetchPath } from './utils'

await setup({
  rootDir: fileURLToPath(new URL('../playground', import.meta.url)),
  server: true,
  browser: false,
})

describe('pages', () => {
  it('render index', async () => {
    const $ = await $fetchPath('/')
    const metaTags = $('head > meta').toArray()
    expect(metaTags).toMatchInlineSnapshot(`
      [
        <meta
          charset="utf-8"
        />,
        <meta
          content="https://nuxtjs.org/meta_400.png"
          property="og:image"
        />,
        <meta
          content="https://nuxtjs.org"
          property="og:url"
        />,
        <meta
          content="NuxtJS"
          property="og:site:name"
        />,
        <meta
          content="website"
          property="og:type"
        />,
        <meta
          content="en_US"
          property="og:locale"
        />,
        <meta
          content="fr_FR"
          property="og:locale:alternate"
        />,
        <meta
          content="summary_large_image"
          property="twitter:card"
        />,
        <meta
          content="@nuxt_js"
          property="twitter:site"
        />,
        <meta
          content="noindex"
          name="robots"
        />,
        <meta
          content="description"
          name="description"
        />,
        <meta
          content="test 0 - Nuxt module playground"
          name="og:title"
        />,
        <meta
          content="description"
          name="og:description"
        />,
        <meta
          content="16"
          name="head:count"
        />,
      ]
    `)
  })
})
