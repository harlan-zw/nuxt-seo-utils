import type { ConfigSchema } from '@nuxt/schema'
import type { UseHeadOptions } from '@unhead/vue'
import type { Head, Link, MetaFlat, RawInput } from '@unhead/vue/types'

export interface SeoUtilsRuntimeConfig {
  canonicalQueryWhitelist: string[]
  canonicalLowercase: boolean
  automaticTwitterTags: boolean
  tagPriority: UseHeadOptions['tagPriority']
  separator?: string
  titleSeparator?: string
  colorModeIcons?: ColorModeIconLinks
}

// Match Nuxt's partial config input while keeping resolved options required.
type PartialConfig<T> = T extends (...args: never[]) => unknown ? T
  : T extends Record<string, any> ? { [Key in keyof T]?: PartialConfig<T[Key]> } : T

type SeoUtilsAppConfig = Omit<ConfigSchema['app'], 'head'> & {
  seoMeta?: MetaFlatSerializable
  head: ConfigSchema['app']['head'] & { seoMeta?: MetaFlatSerializable }
}

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    'seo-utils': SeoUtilsRuntimeConfig
  }

  interface NuxtConfig {
    app?: PartialConfig<SeoUtilsAppConfig>
  }

  interface NuxtOptions {
    app: SeoUtilsAppConfig
  }
}

// Nuxt's config entry uses these interfaces through its schema bridge.
declare module 'nuxt/schema' {
  interface NuxtConfig {
    app?: PartialConfig<SeoUtilsAppConfig>
  }

  interface NuxtOptions {
    app: SeoUtilsAppConfig
  }
}

export interface ColorModeIconLinks {
  dark: Link[]
  light: Link[]
}

export type MetaFlatSerializable = MetaFlat & {
  title?: RawInput<'title'>
  titleTemplate?: RawInput<'titleTemplate'>
}

export type { Head }
