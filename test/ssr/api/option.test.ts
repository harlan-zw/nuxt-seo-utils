import { describe, expect, it } from 'vitest'
import { $fetchPath, setupTestSSR } from '../../utils'

await setupTestSSR()

describe('option api', () => {
  it('basic works', async () => {
    const $ = await $fetchPath('/api/option/basic')
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
          content="Hi, welcome to the live v1.3.2 of Nuxt Playground."
          name="description"
        />,
        <meta
          content="https://nuxtjs.org/meta_400.png"
          property="og:image"
        />,
      ]
    `)
  })
  it('function works', async () => {
    const $ = await $fetchPath('/api/option/function')
    const title = $('title').toString()
    expect(title).toMatchInlineSnapshot('"<title>Nuxt Playground</title>"')
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
          content="Hi, welcome to the live v1.3.2 of Nuxt Playground."
          name="description"
        />,
        <meta
          content="https://nuxtjs.org/meta_400.png"
          property="og:image"
        />,
      ]
    `)
  })
})
