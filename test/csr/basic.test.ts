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
        "headTagCount": 5,
        "headTags": [
          "<meta charset=\\"utf-8\\">",
          "<meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1\\">",
          "<meta name=\\"description\\" content=\\"description\\">",
          "<link href=\\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap\\" rel=\\"stylesheet\\">",
          "<meta name=\\"head:count\\" content=\\"5\\">",
        ],
        "htmlAttrs": [],
        "title": "test 0 - Nuxt module playground",
      }
    `)
    await expectNoClientErrors('/')
  }, 10000)

  it('reactive', async () => {
    const page = await createPage('/api/composition/reactivity')
    let ctx = await queryHeadState(page)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": [
          {
            "name": "style",
            "value": "background: lightskyblue; margin: 50px 100px; padding: 20px;",
          },
          {
            "name": "data-head-attrs",
            "value": "style",
          },
        ],
        "bodyTags": {},
        "headTagCount": 2,
        "headTags": [
          "<meta charset=\\"utf-8\\">",
          "<meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1\\">",
        ],
        "htmlAttrs": [
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
        ],
        "title": "Html: limegreen Body: lightskyblue",
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
          {
            "name": "data-head-attrs",
            "value": "style",
          },
        ],
        "bodyTags": {},
        "headTagCount": 2,
        "headTags": [
          "<meta charset=\\"utf-8\\">",
          "<meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1\\">",
        ],
        "htmlAttrs": [
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
        ],
        "title": "Html: lightskyblue Body: yellow",
      }
    `)
  }, 30000)

  // ensure moving between pages removes html attrs
  it('nav', async () => {
    const page = await createPage('/examples/red')
    await page.waitForLoadState('networkidle')
    let htmlAttrs = await page.evaluate('[...document.children[0].attributes].map(f => ({ name: f.name, value: f.value }))')
    let title = await page.title()
    expect(title).toMatchInlineSnapshot('"red"')
    expect(htmlAttrs).toMatchInlineSnapshot(`
      [
        {
          "name": "style",
          "value": "background: red",
        },
        {
          "name": "data-head-attrs",
          "value": "style",
        },
      ]
    `)

    await page.click('a[href="/"]')

    htmlAttrs = await page.evaluate('[...document.children[0].attributes].map(f => ({ name: f.name, value: f.value }))')
    title = await page.title()
    expect(title).toMatchInlineSnapshot('"test 0 - Nuxt module playground"')
    expect(htmlAttrs.length === 0).toBeTruthy()
  }, 10000)
})
