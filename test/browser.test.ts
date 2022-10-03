import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import { getBrowser, setup } from '@nuxt/test-utils'
import { $fetchPath, expectNoClientErrors } from './utils'

/**
 * Note: These tests are the same as basic.test.ts, but they run on the browser and check for console errors.
 * This is seperated as the CI will occasionally hang forever due to the browser.
 */

await setup({
  rootDir: fileURLToPath(new URL('../playground', import.meta.url)),
  server: true,
  browser: true,
  browserOptions: {
    type: 'chromium',
    launch: {
      timeout: 30000,
    },
  },
})

afterAll(() => {
  const browser = await getBrowser()
  await browser.close()
})

describe('pages', () => {
  it('render index', async () => {
    const $ = await $fetchPath('/')
    const metaTags = $('head > meta').toArray()
    // Snapshot
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
          content="17"
          name="head:count"
        />,
      ]
    `)

    await expectNoClientErrors('/')
  })
})
