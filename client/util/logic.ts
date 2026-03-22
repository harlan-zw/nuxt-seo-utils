import { useDebounceFn } from '@vueuse/core'
import { ref } from 'vue'

export const refreshTime = ref(Date.now())
export const path = ref('/')
export const hostname = typeof window !== 'undefined' ? window.location.host : 'localhost:3000'

export const refreshSources = useDebounceFn(() => {
  refreshTime.value = Date.now()
}, 200)
