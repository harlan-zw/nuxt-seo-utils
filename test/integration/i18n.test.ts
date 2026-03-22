import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/i18n'),
})

describe('i18n', () => {
  it('en', async () => {
    // extract the <head>
    const html = await $fetch('/')
    const htmlAttributes = html.match(/<html([\s\S]*?)>/)?.[1]
    expect(htmlAttributes).toMatchInlineSnapshot(`"  lang="en-US""`)
    const head = html.match(/<head>([\s\S]*)<\/head>/)?.[1]
    const expectedMetaTags = [
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<meta property="og:type" content="website">',
      '<title>nuxt-seo-utils</title>',
      '<meta name="description" content="en description">',
      '<meta name="twitter:card" content="summary_large_image">',
      '<meta property="og:title" data-infer="" content="nuxt-seo-utils">',
      '<meta property="og:description" data-infer="" content="en description">',
      '<meta property="og:url" content="https://nuxtseo.com/">',
      '<meta property="og:locale" content="en_US">',
      '<meta property="og:site_name" content="nuxt-seo-utils">',
    ]
    for (const tag of expectedMetaTags) {
      expect(head).toContain(tag)
    }
  }, 30_000)

  it('fr', async () => {
    // extract the <head>
    const html = (await $fetch('/fr')) as string
    const htmlAttributes = html.match(/<html([\s\S]*?)>/)?.[1]
    expect(htmlAttributes).toMatchInlineSnapshot(`"  lang="fr-FR""`)
    const head = html.match(/<head>([\s\S]*)<\/head>/)?.[1]
    // remove all style tags
    const expectedMetaTags = [
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<meta property="og:type" content="website">',
      '<title>Fr | fr name</title>',
      '<meta name="description" content="fr description">',
      '<meta name="twitter:card" content="summary_large_image">',
      '<meta property="og:title" data-infer="" content="Fr | fr name">',
      '<meta property="og:description" data-infer="" content="fr description">',
      '<meta property="og:url" content="https://nuxtseo.com/fr">',
      '<meta property="og:locale" content="fr_FR">',
      '<meta property="og:site_name" content="fr name">',
    ]
    for (const tag of expectedMetaTags) {
      expect(head).toContain(tag)
    }
  }, 30_000)
})
