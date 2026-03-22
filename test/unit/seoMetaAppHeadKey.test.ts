import type { Nuxt } from '@nuxt/schema'
import type { UseSeoMetaInput } from '@unhead/vue/types'
import { describe, expect, it } from 'vitest'
import extendNuxtConfigAppHeadSeoMeta from '../../src/build-time/extendNuxtConfigAppHeadSeoMeta'

describe('seoMetaAppHeadKey', () => {
  it('simple ', async () => {
    const mockNuxt = {
      options: {
        app: {
          seoMeta: <UseSeoMetaInput> {
            title: 'test',
            description: 'test',
            ogImage: 'test',
            ogUrl: 'test',
          },
        },
      },
    } as any as Nuxt
    extendNuxtConfigAppHeadSeoMeta(mockNuxt)
    expect(mockNuxt.options.app.head).toMatchInlineSnapshot(`
      {
        "meta": [
          {
            "content": "test",
            "name": "title",
          },
          {
            "content": "test",
            "name": "description",
          },
          {
            "content": "test",
            "property": "og:image",
          },
          {
            "content": "test",
            "property": "og:url",
          },
        ],
      }
    `)
  })

  it('seo.meta config key (#73)', async () => {
    const mockNuxt = {
      options: {
        seo: {
          meta: {
            ogTitle: 'My OG Title',
            ogDescription: 'My OG Description',
          },
        },
        app: {
          head: {
            title: 'My Title',
            titleTemplate: '%s | My Site',
          },
        },
      },
    } as any as Nuxt
    extendNuxtConfigAppHeadSeoMeta(mockNuxt)
    expect(mockNuxt.options.app.head.meta).toContainEqual({
      property: 'og:title',
      content: 'My OG Title',
    })
    expect(mockNuxt.options.app.head.meta).toContainEqual({
      property: 'og:description',
      content: 'My OG Description',
    })
  })

  it('merge ', async () => {
    const mockNuxt = {
      options: {
        app: {
          head: {
            meta: [
              {
                property: 'og:image',
                content: 'app.head',
              },
            ],
          },
          seoMeta: <UseSeoMetaInput> {
            title: 'test',
            description: 'test',
            ogImage: 'app.seoMeta',
            ogUrl: 'test',
          },
        },
      },
    } as any as Nuxt
    extendNuxtConfigAppHeadSeoMeta(mockNuxt)
    expect(mockNuxt.options.app.head).toMatchInlineSnapshot(`
      {
        "meta": [
          {
            "content": "app.head",
            "property": "og:image",
          },
          {
            "content": "test",
            "name": "title",
          },
          {
            "content": "test",
            "name": "description",
          },
          {
            "content": "app.seoMeta",
            "property": "og:image",
          },
          {
            "content": "test",
            "property": "og:url",
          },
        ],
      }
    `)
  })
})
