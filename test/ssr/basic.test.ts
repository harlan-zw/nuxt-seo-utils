import { describe, expect, it } from 'vitest'
import { $fetchPath, setupTestSSR } from '../utils'

await setupTestSSR()

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
          content="http://127.0.0.1:44195/og-image.png"
          property="og:image"
        />,
        <meta
          content="1270"
          property="og:image:width"
        />,
        <meta
          content="630"
          property="og:image:height"
        />,
        <meta
          content="http://127.0.0.1:44195/og-image.png"
          name="twitter:image"
        />,
        <meta
          content="1270"
          name="twitter:image:width"
        />,
        <meta
          content="630"
          name="twitter:image:height"
        />,
        <meta
          content="Hi, welcome to the live v1.3.4 of Nuxt Playground."
          name="description"
        />,
      ]
    `)
  })
})
