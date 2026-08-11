import type { Head, Link, MetaFlat, RawInput } from '@unhead/vue/types'

export interface ColorModeIconLinks {
  dark: Link[]
  light: Link[]
}

export type MetaFlatSerializable = MetaFlat & {
  title?: RawInput<'title'>
  titleTemplate?: RawInput<'titleTemplate'>
}

export type { Head }
