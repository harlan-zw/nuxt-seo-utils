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
          content="width=device-width, initial-scale=1"
          name="viewport"
        />,
        <meta
          content="DPR"
          http-equiv="accept-ch"
        />,
        <meta
          content="https://harlanzw.com/og.png"
          property="og:image"
        />,
        <meta
          content="https://harlanzw.com"
          property="og:url"
        />,
        <meta
          content="Harlan Wilton"
          property="og:site:name"
        />,
        <meta
          content="website"
          property="og:type"
        />,
        <meta
          content="en_AU"
          property="og:locale"
        />,
        <meta
          content="summary_large_image"
          property="twitter:card"
        />,
        <meta
          content="@harlan-zw"
          property="twitter:site"
        />,
        <meta
          content="max-snippet:-1, max-image-preview:large"
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
          content="22"
          name="head:count"
        />,
      ]
    `)
  })
})
