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
          content="description"
          name="description"
        />,
        <meta
          content="5"
          name="head:count"
        />,
      ]
    `)
  })
})
