import { describe, expect, it } from 'vitest'
import { createPage } from '@nuxt/test-utils'
import { setupTestCSR } from '../utils'

await setupTestCSR()

describe('suspense', () => {
  it('head not updated mid-suspense', async () => {
    const page = await createPage('/')
    await page.waitForLoadState('networkidle')
    await page.click('a[href="/features/delay"]', { noWaitAfter: true })

    // check page title
    let title = await page.title()
    expect(title).toMatchInlineSnapshot('"0 | Nuxt Playground"')

    // wait 500ms
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve()
      }, 500)
    })
    // check page title
    title = await page.title()
    expect(title).toMatchInlineSnapshot('"0 | Nuxt Playground"')

    // wait 5s, page should be updated
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve()
      }, 5000)
    })

    title = await page.title()
    expect(title).toMatchInlineSnapshot('"Delayed title | Nuxt Playground"')
  }, 10000)
})
