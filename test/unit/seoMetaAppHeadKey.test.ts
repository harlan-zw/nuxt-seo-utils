import type { Nuxt } from '@nuxt/schema'
import type { UseSeoMetaInput } from '@unhead/schema'
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
    expect(await extendNuxtConfigAppHeadSeoMeta(mockNuxt)).toMatchInlineSnapshot(`
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
    expect(await extendNuxtConfigAppHeadSeoMeta(mockNuxt)).toMatchInlineSnapshot(`
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
