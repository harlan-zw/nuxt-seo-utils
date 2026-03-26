import { ref, watch } from 'vue'

export const data = ref<{
  runtimeConfig: { version: string, [key: string]: any }
  siteConfig: { url: string, env: string, indexable: boolean }
} | null>(null)

export async function refreshSources() {
  if (!appFetch.value)
    return
  data.value = await appFetch.value('/__nuxt-seo-utils/debug.json', {
    query: { path: path.value },
  }).catch(() => null)
}

watch([path, appFetch, refreshTime], () => {
  refreshSources()
})
