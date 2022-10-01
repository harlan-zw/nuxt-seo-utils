import { HeadObject } from '@vueuse/head'
import { MaybeComputedRef } from '@vueuse/shared'
import { ComputedGetter } from 'vue'

export interface MetaObject extends HeadObject {
  /**
   * The character encoding in which the document is encoded => `<meta charset="<value>" />`
   *
   * @default `'utf-8'`
   */
  charset?: MaybeComputedRef<string>
  /**
   * Configuration of the viewport (the area of the window in which web content can be seen),
   * mapped to => `<meta name="viewport" content="<value>" />`
   *
   * @default `'width=device-width, initial-scale=1'`
   */
  viewport?: MaybeComputedRef<string>
}

export type UseHeadInput = MetaObject | ComputedGetter<MetaObject>
