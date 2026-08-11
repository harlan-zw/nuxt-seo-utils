import { ref, watch } from 'vue'

export interface DebugData {
  runtimeConfig: { version: string, appBaseURL: string, [key: string]: any }
  siteConfig: {
    url: string
    name: string
    description: string
    env: string
    indexable: boolean
    trailingSlash: boolean
    titleSeparator: string
    defaultLocale: string
    currentLocale: string
    twitter: string
  }
  headConfig: {
    link: Array<{ rel: string, href: string, type?: string, sizes?: string, media?: string }>
    meta: Array<{ name?: string, property?: string, content?: string }>
  }
}

export const data = ref<DebugData | null>(null)

export async function refreshSources() {
  if (!appFetch.value)
    return
  data.value = await appFetch.value('/__nuxt-seo-utils/debug.json', {
    query: { path: path.value },
  }).catch(() => {
    // A failed devtools refresh means no debug data is available until the next poll.
    return null
  })
}

watch([path, appFetch, refreshTime], () => {
  refreshSources()
})
