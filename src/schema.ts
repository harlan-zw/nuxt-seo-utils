import type { HeadObject } from '@vueuse/head'
import type { MergeHead } from '@zhead/schema'
import type { MaybeComputedRef } from '@vueuse/shared'

export interface HeadAugmentations extends MergeHead {
  // runtime overrides
}

export interface MetaObject extends HeadObject<HeadAugmentations> {
  /**
   * The character encoding in which the document is encoded => `<meta charset="<value>" />`
   *
   * @default `'utf-8'`
   */
  charset?: string
  /**
   * Configuration of the viewport (the area of the window in which web content can be seen),
   * mapped to => `<meta name="viewport" content="<value>" />`
   *
   * @default `'width=device-width, initial-scale=1'`
   */
  viewport?: string
}

export type UseHeadInput = MaybeComputedRef<MetaObject>
