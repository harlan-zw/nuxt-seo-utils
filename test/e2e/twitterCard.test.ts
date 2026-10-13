import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/twitter-card'),
})

async function twitterCards(path: string) {
  const $ = load(await $fetch<string>(path))
  return $('meta[name="twitter:card"]').map((_, el) => $(el).attr('content')).get()
}

describe('inferred twitter:card', () => {
  it('uses summary when the page has no image', async () => {
    expect(await twitterCards('/')).toEqual(['summary'])
  }, 30_000)

  it('uses summary_large_image when the page sets an og:image', async () => {
    expect(await twitterCards('/og-image')).toEqual(['summary_large_image'])
  }, 30_000)

  it('keeps the twitter:card the page sets', async () => {
    expect(await twitterCards('/explicit')).toEqual(['summary'])
  }, 30_000)
})
