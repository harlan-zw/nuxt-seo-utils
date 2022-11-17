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
          content="My site description"
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
    expect(title).toMatchInlineSnapshot('"<title>Api-option-function - Nuxt module playground</title>"')
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
          content="My site description"
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
