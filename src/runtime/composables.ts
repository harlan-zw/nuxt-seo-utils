import type { MetaFlatRef } from '@zhead/vue'
import { unpackMeta } from '@zhead/vue'
import { ref, watchEffect } from 'vue'
import type { MaybeComputedRef } from '@vueuse/head'
import { useHead } from '#imports'

export function useMetaTags(metaTags: MaybeComputedRef<MetaFlatRef>) {
  const tags = ref([])
  watchEffect(() => {
    tags.value = unpackMeta(metaTags).value
    useHead({
      meta: tags.value,
    })
  })
  return tags
}
