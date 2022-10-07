import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createPage, setup } from '@nuxt/test-utils'
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
          content="8"
          name="head:count"
        />,
      ]
    `)

    await expectNoClientErrors('/')
  })

  it.only('reactive', async () => {
    const page = await createPage('/composition/reactivity')
    let htmlAttrs = await page.evaluate('[...document.children[0].attributes].map(f => ({ name: f.name, value: f.value }))')
    let bodyAttrs = await page.evaluate('[...document.querySelector(\'body\').attributes].map(f => ({ name: f.name, value: f.value }))')
    let title = await page.title()
    expect(htmlAttrs).toMatchInlineSnapshot(`
      [
        {
          "name": "style",
          "value": "background: limegreen",
        },
        {
          "name": "lang",
          "value": "en-AU",
        },
        {
          "name": "dir",
          "value": "ltr",
        },
        {
          "name": "data-head-attrs",
          "value": "style,lang,dir",
        },
      ]
    `)
    expect(bodyAttrs).toMatchInlineSnapshot(`
      [
        {
          "name": "style",
          "value": "background: lightskyblue; margin: 50px 100px; padding: 20px;",
        },
        {
          "name": "data-head-attrs",
          "value": "style",
        },
      ]
    `)
    expect(title).toMatchInlineSnapshot('"Html: limegreen Body: lightskyblue"')

    await page.click('button')
    htmlAttrs = await page.evaluate('[...document.children[0].attributes].map(f => ({ name: f.name, value: f.value }))')
    bodyAttrs = await page.evaluate('[...document.querySelector(\'body\').attributes].map(f => ({ name: f.name, value: f.value }))')
    title = await page.title()

    expect(htmlAttrs).toMatchInlineSnapshot(`
      [
        {
          "name": "style",
          "value": "background: lightskyblue",
        },
        {
          "name": "lang",
          "value": "en-AU",
        },
        {
          "name": "dir",
          "value": "ltr",
        },
        {
          "name": "data-head-attrs",
          "value": "style,lang,dir",
        },
      ]
    `)
    expect(bodyAttrs).toMatchInlineSnapshot(`
      [
        {
          "name": "style",
          "value": "background: yellow; margin: 50px 100px; padding: 20px;",
        },
        {
          "name": "data-head-attrs",
          "value": "style",
        },
      ]
    `)
    expect(title).toMatchInlineSnapshot('"Html: lightskyblue Body: yellow"')
  })
})
