import { describe, expect, it } from 'vitest'
import { $fetchPath, setupTestSSR } from '../../utils'

await setupTestSSR()

describe('component api', () => {
  it('nested', async () => {
    const $ = await $fetchPath('/api/component/nested')
    const metaTags = $('head > meta').toArray()
    const lang = $('html').attr('lang')
    const bodyClasses = $('body').attr('class')
    expect(lang).toMatchInlineSnapshot('"en-AU"')
    expect(bodyClasses).toMatchInlineSnapshot('"text-gray-800 dark:text-gray-100 antialiased"')
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
          content="1270"
          property="og:image:width"
        />,
        <meta
          content="630"
          property="og:image:height"
        />,
        <meta
          content="https://harlanzw.com/og-image.png"
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
        <meta
          content="http://127.0.0.1:43175/cover.png"
          property="og:image"
        />,
      ]
    `)
  })
})
