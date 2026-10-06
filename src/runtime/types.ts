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

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    'seo-utils': SeoUtilsRuntimeConfig
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
