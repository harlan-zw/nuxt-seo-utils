import { appFetch, colorMode, devtools, useDevtoolsConnection } from 'nuxtseo-layer-devtools/composables/rpc'
import { path, refreshTime } from 'nuxtseo-layer-devtools/composables/state'
import { onMounted, onUnmounted, ref } from 'vue'

export { appFetch, colorMode, devtools }

export const connectionState = ref<'connecting' | 'connected' | 'fallback' | 'failed'>('connecting')

async function tryFallbackConnection() {
  const fallbackUrl = 'http://localhost:3000'
  const res = await fetch(`${fallbackUrl}/`).catch(() => null)
  if (res?.ok) {
    appFetch.value = ((url: string, opts?: any) => fetch(`${fallbackUrl}${url}`, opts).then(r => r.json())) as any
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
  onConnected() {
    connectionState.value = 'connected'
  },
  onRouteChange(route: any) {
    path.value = route?.path || '/'
    refreshTime.value = Date.now()
  },
})
