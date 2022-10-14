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
          content="description"
          name="description"
        />,
        <meta
          content="/cover.png"
          property="og:image"
        />,
        <meta
          content="6"
          name="head:count"
        />,
      ]
    `)
  })
})
