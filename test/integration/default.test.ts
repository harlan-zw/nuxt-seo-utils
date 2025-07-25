import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../playground'),
})

describe('default', () => {
  it('basic', async () => {
    // extract the <head>
    const html = await $fetch('/')
    const head = html.match(/<head>([\s\S]*)<\/head>/)?.[1]
    const htmlAttributes = html.match(/<html([\s\S]*?)>/)?.[1]
    expect(htmlAttributes).toMatchInlineSnapshot(`"  lang="en-US""`)
    const expectedMetaTags = [
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<title>Home x en name</title>',
      '<meta property="og:image" content="https://nuxtseo.com/og-image.png">',
      '<meta property="og:image:type" content="image/png">',
      '<meta property="og:image:width" content="1270">',
      '<meta property="og:image:height" content="630">',
      '<meta property="og:image:alt" content="hello world">',
      '<meta name="twitter:image" content="https://nuxtseo.com/og-image.png">',
      '<meta name="twitter:image:type" content="image/png">',
      '<meta name="twitter:image:width" content="1270">',
      '<meta name="twitter:image:height" content="630">',
      '<meta name="twitter:image:alt" content="hello world">',
      '<meta name="description" content="Hi, welcome to the test v1.3.4 of en name.">',
      '<meta property="og:type" content="website">',
      '<meta name="twitter:card" content="summary_large_image">',
      '<meta property="og:title" data-infer="" content="Home x en name">',
      '<meta property="og:description" data-infer="" content="Hi, welcome to the test v1.3.4 of en name.">',
      '<meta property="og:url" content="https://nuxtseo.com/">',
      '<meta property="og:locale" content="en_US">',
      '<meta property="og:site_name" content="en name">',
    ]
    for (const tag of expectedMetaTags) {
      expect(head).toContain(tag)
    }
  }, 30_000)
})
