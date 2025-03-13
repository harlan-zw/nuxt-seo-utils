import type { Head, MetaFlat, RawInput } from '@unhead/vue/types'

export type MetaFlatSerializable = MetaFlat & {
  title?: RawInput<'title'>
  titleTemplate?: RawInput<'titleTemplate'>
}

export type { Head }
