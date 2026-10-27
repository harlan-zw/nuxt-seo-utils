import type { NuxtConfig, NuxtOptions } from '@nuxt/schema'
import type { NuxtOptions as BridgedNuxtOptions } from 'nuxt/schema'
import { useRuntimeConfig } from 'nuxt/app'
import { defineNuxtConfig } from 'nuxt/config'

const config = useRuntimeConfig()
export const apiBase: string = config.public.apiBase
export const retryLimit: number = config.public.retryLimit
export const enabled: boolean = config.public.nested.enabled
export const canonicalLowercase: boolean = config.public['seo-utils'].canonicalLowercase
// @ts-expect-error Public runtime config must retain the application's string type.
export const invalidApiBase: number = config.public.apiBase
// @ts-expect-error Public runtime config must retain the application's number type.
export const invalidRetryLimit: string = config.public.retryLimit
// @ts-expect-error Nested runtime config must retain the application's boolean type.
export const invalidEnabled: string = config.public.nested.enabled
// @ts-expect-error Module runtime config must retain its boolean type.
export const invalidCanonicalLowercase: string = config.public['seo-utils'].canonicalLowercase

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

export const schemaConfig: NuxtConfig = {
  app: {
    seoMeta: { description: 'App description' },
    head: { seoMeta: { description: 'Head description' } },
  },
}

declare const options: NuxtOptions
declare const bridgedOptions: BridgedNuxtOptions
export const appDescription: string | undefined = options.app.seoMeta?.description
export const headDescription: string | undefined = options.app.head.seoMeta?.description
export const bridgedDescription: string | undefined = bridgedOptions.app.seoMeta?.description
