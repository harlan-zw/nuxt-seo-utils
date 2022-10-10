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
          content="7"
          name="head:count"
        />,
      ]
    `)
  })
})
