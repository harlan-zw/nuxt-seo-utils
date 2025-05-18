import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/no-i18n'),
  nuxtConfig: {
    site: {
      defaultLocale: 'fr-FR',
    },
  },
})

describe('no i18n module with defaultLocale', () => {
  it('sets lang attribute to configured defaultLocale', async () => {
    const html = await $fetch('/') as string
    const htmlAttributes = html.match(/<html([\s\S]*?)>/)?.[1]
    expect(htmlAttributes).toContain('lang="fr-FR"')
  })
})
