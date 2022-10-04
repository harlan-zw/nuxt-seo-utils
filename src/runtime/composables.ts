import type { MaybeComputedRef } from '@vueuse/shared'
import type { MetaFlatRef } from '@zhead/vue'
import { unpackMeta } from '@zhead/vue'
import type { MetaObject } from '@nuxt/schema'
import { ref, watchEffect } from 'vue'
import { useNuxtApp } from '#app'

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

export function useHead(meta: MetaObject) {
  useNuxtApp()._useHead(meta)
}

export function useHeadRaw(meta: UseHeadRawInput) {
  useNuxtApp()._useHead(meta, { raw: true })
}

export function useMeta(meta: MetaObject) {
  useHead(meta)
}
