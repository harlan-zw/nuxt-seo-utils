<script setup lang="ts">
import { navigateTo, useRoute } from '#imports'
import { computed, ref, watch } from 'vue'
import { data, refreshSources } from './composables/state'
import './composables/rpc'

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
  if (p.startsWith('/social'))
    return 'social'
  if (p.startsWith('/identity'))
    return 'identity'
  if (p.startsWith('/debug'))
    return 'debug'
  if (p.startsWith('/docs'))
    return 'docs'
  return 'meta'
})

const navItems = [
  { value: 'meta', to: '/', icon: 'carbon:tag', label: 'Meta Tags', devOnly: false },
  { value: 'social', to: '/social', icon: 'carbon:share', label: 'Social', devOnly: false },
  { value: 'identity', to: '/identity', icon: 'carbon:identification', label: 'Identity', devOnly: false },
  { value: 'debug', to: '/debug', icon: 'carbon:debug', label: 'Debug', devOnly: true },
  { value: 'docs', to: '/docs', icon: 'carbon:book', label: 'Docs', devOnly: false },
]

const version = computed(() => data.value?.runtimeConfig?.version || '')

watch(isProductionMode, (isProd) => {
  if (isProd && currentTab.value === 'debug')
    return navigateTo('/')
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
