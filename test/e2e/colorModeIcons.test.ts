import { createResolver } from '@nuxt/kit'
import { createPage, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  browser: true,
  dev: true,
  rootDir: resolve('../fixtures/color-mode'),
})

describe('color mode icons', () => {
  it('switches the favicon when the app color mode changes', async () => {
    const page = await createPage('/')
    const favicon = page.locator('head link[rel="icon"]')

    await expect.poll(() => favicon.getAttribute('href')).toBe('/favicon-light.svg')
    await page.locator('#toggle-color-mode').click()
    await expect.poll(() => favicon.getAttribute('href')).toBe('/favicon-dark.svg')
  }, 30_000)
})
