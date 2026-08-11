import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  dev: true,
  rootDir: resolve('../fixtures/color-mode'),
})

describe('color mode icons', () => {
  it('renders the icon selected by the app color mode', async () => {
    const html = await $fetch<string>('/')
    const $ = load(html)
    const icons = $('head link[rel="icon"]')

    expect(icons).toHaveLength(1)
    expect(icons.attr('href')).toBe('/favicon-light.svg')
    expect(icons.attr('media')).toBeUndefined()
  }, 30_000)
})
