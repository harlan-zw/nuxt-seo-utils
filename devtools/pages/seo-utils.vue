<script setup lang="ts">
import { isProductionMode, navigateTo, useRoute } from '#imports'
import { computed, ref, watch } from 'vue'
import { data, refreshSources } from '../lib/seo-utils/state'
import '../lib/seo-utils/rpc'

const refreshing = ref(false)

async function refresh() {
  if (refreshing.value)
    return
  refreshing.value = true
  data.value = null
  await refreshSources()
  setTimeout(() => {
    refreshing.value = false
  }, 300)
}

const route = useRoute()
const currentTab = computed(() => {
  const p = route.path
  if (p.startsWith('/seo-utils/social'))
    return 'social'
  if (p.startsWith('/seo-utils/identity'))
    return 'identity'
  if (p.startsWith('/seo-utils/debug'))
    return 'debug'
  if (p.startsWith('/seo-utils/docs'))
    return 'docs'
  return 'meta'
})

const navItems = [
  { value: 'meta', to: '/seo-utils', icon: 'carbon:tag', label: 'Meta Tags', devOnly: false },
  { value: 'social', to: '/seo-utils/social', icon: 'carbon:share', label: 'Social', devOnly: false },
  { value: 'identity', to: '/seo-utils/identity', icon: 'carbon:identification', label: 'Identity', devOnly: false },
  { value: 'debug', to: '/seo-utils/debug', icon: 'carbon:debug', label: 'Debug', devOnly: true },
  { value: 'docs', to: '/seo-utils/docs', icon: 'carbon:book', label: 'Docs', devOnly: false },
]

const version = computed(() => data.value?.runtimeConfig?.version || '')

watch(isProductionMode, (isProd) => {
  if (isProd && currentTab.value === 'debug')
    return navigateTo('/seo-utils')
})
</script>

<template>
  <DevtoolsLayout
    v-model:active-tab="currentTab"
    module-name="nuxt-seo-utils"
    title="SEO Utils"
    icon="carbon:search-locate"
    :version="version"
    :nav-items="navItems"
    github-url="https://github.com/harlan-zw/nuxt-seo-utils"
    :loading="!data || refreshing"
    @refresh="refresh"
  >
    <NuxtPage />
  </DevtoolsLayout>
</template>
