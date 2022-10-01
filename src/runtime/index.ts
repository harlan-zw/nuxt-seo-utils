import { MetaFlatRef, unpackMeta } from '@zhead/vue'
import type { MaybeComputedRef } from '@vueuse/shared'
import { UseHeadInput } from '../types'
import { ref, watchEffect } from '#build/imports'

export function useMetaTags (metaTags: MaybeComputedRef<MetaFlatRef>) {
  const tags = ref([])
  watchEffect(() => {
    tags.value = unpackMeta(metaTags).value
    useHead({
      meta: tags.value
    })
  })
  return tags
}

export function useHead (meta: UseHeadInput) {
  useNuxtApp()._useHead(meta)
}

export function useMeta (meta: UseHeadInput) {
  useHead(meta)
}
