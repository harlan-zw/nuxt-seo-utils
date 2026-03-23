import type { NuxtDevtoolsIframeClient } from '@nuxt/devtools-kit/types'
import type { $Fetch } from 'nitropack/types'
import { appFetch, path, refreshTime, useDevtoolsConnection } from '#imports'
import { computed, onMounted, onUnmounted, ref } from 'vue'

export { appFetch, colorMode, devtools } from '#imports'

export const devtoolsClient = ref<NuxtDevtoolsIframeClient>()

export const connectionState = ref<'connecting' | 'connected' | 'fallback' | 'failed'>('connecting')
export const isConnected = computed(() => connectionState.value === 'connected' || connectionState.value === 'fallback')
export const isConnectionFailed = computed(() => connectionState.value === 'failed')
export const isFallbackMode = computed(() => connectionState.value === 'fallback')

async function tryFallbackConnection() {
  const fallbackUrl = 'http://localhost:3000'
  const res = await fetch(`${fallbackUrl}/`).catch(() => null)
  if (res?.ok) {
    appFetch.value = ((url: string, opts?: any) => fetch(`${fallbackUrl}${url}`, opts).then(r => r.json())) as $Fetch
    path.value = '/'
    connectionState.value = 'fallback'
    return true
  }
  return false
}

onMounted(() => {
  const timer = setTimeout(async () => {
    if (connectionState.value === 'connecting') {
      const fallbackWorked = await tryFallbackConnection()
      if (!fallbackWorked) {
        connectionState.value = 'failed'
      }
    }
  }, 2000)

  onUnmounted(() => {
    clearTimeout(timer)
  })
})

useDevtoolsConnection({
  onConnected(client) {
    connectionState.value = 'connected'
    devtoolsClient.value = client
  },
  onRouteChange(route) {
    path.value = route?.path || '/'
    refreshTime.value = Date.now()
  },
})
