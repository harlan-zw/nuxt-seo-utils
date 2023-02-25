import { describe, expect, it } from 'vitest'
import { $fetchPath, setupTestSSR } from '../../utils'

await setupTestSSR()

// @todo these seem to be broken for SSR
describe.skip('option api', () => {
  it('basic works', async () => {
    const $ = await $fetchPath('/api/option/basic')
    const title = $('title').toString()
    expect(title).toMatchInlineSnapshot('"<title> | Nuxt Playground</title>"')
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
          content="Hi, welcome to the live v1.3.4 of Nuxt Playground."
          name="description"
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
          content="Hi, welcome to the live v1.3.4 of Nuxt Playground."
          name="description"
        />,
      ]
    `)
  })
})
