import type { NuxtConfig, NuxtOptions } from '@nuxt/schema'
import type { NuxtOptions as BridgedNuxtOptions } from 'nuxt/schema'
import { useRuntimeConfig } from 'nuxt/app'
import { defineNuxtConfig } from 'nuxt/config'
import '../../src/runtime/types'

// An application or another module supplies its public runtime config types.
declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    api: string
  }
}

const config = useRuntimeConfig()
const api: string = config.public.api
const canonicalLowercase: boolean = config.public['seo-utils'].canonicalLowercase
// @ts-expect-error Public runtime config must retain the application's string type.
const invalidApi: number = config.public.api
// @ts-expect-error Module runtime config must retain its boolean type.
const invalidCanonicalLowercase: string = config.public['seo-utils'].canonicalLowercase

defineNuxtConfig({
  app: {
    baseURL: '/docs/',
    seoMeta: { ogTitle: 'App title', description: 'App description' },
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width',
      title: 'Head title',
      seoMeta: { ogTitle: 'Head title', description: 'Head description' },
      meta: [{ name: 'author', content: 'Author' }],
    },
    pageTransition: { name: 'page' },
    viewTransition: { types: ['slide'] },
  },
})

defineNuxtConfig({
  app: {
    // @ts-expect-error Native app options must retain their types.
    baseURL: 123,
  },
})

defineNuxtConfig({
  app: {
    seoMeta: {
      // @ts-expect-error SEO metadata must retain its value types.
      description: 123,
    },
  },
})

defineNuxtConfig({
  app: {
    head: {
      seoMeta: {
        // @ts-expect-error Head SEO metadata must retain its value types.
        description: 123,
      },
    },
  },
})

const schemaConfig: NuxtConfig = {
  app: {
    seoMeta: { description: 'App description' },
    head: { seoMeta: { description: 'Head description' } },
  },
}

declare const options: NuxtOptions
declare const bridgedOptions: BridgedNuxtOptions
const appDescription: string | undefined = options.app.seoMeta?.description
const headDescription: string | undefined = options.app.head.seoMeta?.description
const bridgedDescription: string | undefined = bridgedOptions.app.seoMeta?.description

export { api, appDescription, bridgedDescription, canonicalLowercase, headDescription, invalidApi, invalidCanonicalLowercase, schemaConfig }
