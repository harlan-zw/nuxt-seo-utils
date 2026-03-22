import type { NuxtDevtoolsClient, NuxtDevtoolsIframeClient } from '@nuxt/devtools-kit/types'
import type { $Fetch } from 'nitropack/types'
import { onDevtoolsClientConnected } from '@nuxt/devtools-kit/iframe-client'
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue'
import { path, refreshTime } from '../util/logic'

export const appFetch = ref<$Fetch>()
export const devtools = ref<NuxtDevtoolsClient>()
export const devtoolsClient = ref<NuxtDevtoolsIframeClient>()
export const colorMode = ref<'dark' | 'light'>('dark')

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

onDevtoolsClientConnected(async (client) => {
  connectionState.value = 'connected'
  // @ts-expect-error untyped
  appFetch.value = client.host.app.$fetch
  watchEffect(() => {
    colorMode.value = client.host.app.colorMode.value
  })
  const $route = client.host.nuxt.vueApp.config.globalProperties?.$route
  path.value = $route?.path || '/'
  client.host.nuxt.$router.afterEach((route: any) => {
    path.value = route.path
    refreshTime.value = Date.now()
  })
  devtools.value = client.devtools
  devtoolsClient.value = client
})
