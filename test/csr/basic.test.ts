import { describe, expect, it } from 'vitest'
import { createPage } from '@nuxt/test-utils'
import { expectNoClientErrors, queryHeadState, setupTestCSR } from '../utils'

await setupTestCSR()

describe('basic', () => {
  it('basic', async () => {
    const page = await createPage('/')
    const ctx = await queryHeadState(page)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": [],
        "bodyTags": {},
        "headTagCount": 0,
        "headTags": [],
        "htmlAttrs": [],
        "title": "0 | Nuxt Playground",
      }
    `)
    await expectNoClientErrors('/')
  }, 10000)

  it('reactive', async () => {
    const page = await createPage('/api/composition/reactivity')
    let ctx = await queryHeadState(page)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": [],
        "bodyTags": {},
        "headTagCount": 0,
        "headTags": [],
        "htmlAttrs": [],
        "title": "Html: limegreen Body: lightskyblue | Nuxt Playground",
      }
    `)

    await page.click('button')
    ctx = await queryHeadState(page, false)

    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": [
          {
            "name": "style",
            "value": "background: yellow; margin: 50px 100px; padding: 20px;",
          },
        ],
        "bodyTags": {},
        "headTagCount": 0,
        "headTags": [],
        "htmlAttrs": [
          {
            "name": "class",
            "value": "api-composition-reactivity",
          },
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
        ],
        "title": "Html: lightskyblue Body: yellow | Nuxt Playground",
      }
    `)
  }, 30000)

  // ensure moving between pages removes html attrs
  it('nav', async () => {
    const page = await createPage('/examples/red')
    await page.waitForLoadState('networkidle')
    let htmlAttrs = await page.evaluate('[...document.children[0].attributes].map(f => ({ name: f.name, value: f.value }))')
    let title = await page.title()
    expect(title).toMatchInlineSnapshot('"Nuxt Playground"')
    expect(htmlAttrs).toMatchInlineSnapshot(`
      [
        {
          "name": "class",
          "value": "examples-red",
        },
        {
          "name": "style",
          "value": "background: red",
        },
      ]
    `)

    await page.click('a[href="/"]')

    htmlAttrs = await page.evaluate('[...document.children[0].attributes].map(f => ({ name: f.name, value: f.value }))')
    title = await page.title()
    expect(title).toMatchInlineSnapshot('"0 | Nuxt Playground"')
  }, 10000)
})
