import { describe, expect, it } from 'vitest'
import { createPage } from '@nuxt/test-utils'
import { expectNoClientErrors, queryHeadState, setupTestCSR } from '../utils'

await setupTestCSR()

// https://github.com/nuxt/framework/issues/8181

describe('8181', () => {
  it('should keep styles when clicking same route', async () => {
    const page = await createPage('/issues/8181/test')
    let ctx = await queryHeadState(page)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": [],
        "bodyTags": {},
        "headTagCount": 6,
        "headTags": [
          "<meta charset=\\"utf-8\\">",
          "<meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1\\">",
          "<meta name=\\"description\\" content=\\"description\\">",
          "<link href=\\"/\\">",
          "<link href=\\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap\\" rel=\\"stylesheet\\">",
          "<style>.red { background-color: red }</style>",
        ],
        "htmlAttrs": [],
        "title": "test - Nuxt module playground",
      }
    `)
    expect(ctx.headTags.indexOf('<style>.red { background-color: red }</style>')).to.be.gte(0)
    await page.click('a[href="/issues/8181/test"]')
    ctx = await queryHeadState(page)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": [],
        "bodyTags": {},
        "headTagCount": 6,
        "headTags": [
          "<meta charset=\\"utf-8\\">",
          "<meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1\\">",
          "<meta name=\\"description\\" content=\\"description\\">",
          "<link href=\\"/\\">",
          "<link href=\\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap\\" rel=\\"stylesheet\\">",
          "<style></style>",
        ],
        "htmlAttrs": [],
        "title": "test - Nuxt module playground",
      }
    `)
    expect(ctx.headTags.indexOf('<style>.red { background-color: red }</style>')).to.be.gte(0)
  }, 10000)
})
