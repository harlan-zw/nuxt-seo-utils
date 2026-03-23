<script lang="ts" setup>
import { computed, path as hostPath, watchEffect } from '#imports'
import { useAsyncData } from 'nuxt/app'
import { appFetch } from './composables/rpc'

const { data: debugData } = await useAsyncData('seo-utils-debug', async () => {
  if (!appFetch.value)
    return null
  return appFetch.value('/__nuxt-seo-utils/debug.json')
}, { watch: [appFetch] })

const navItems = [
  { value: 'meta', to: '/', icon: 'carbon:tag', label: 'Meta Tags' },
  { value: 'social', to: '/social', icon: 'carbon:share', label: 'Social' },
]

const connectionReady = computed(() => !!appFetch.value)
</script>

<template>
  <DevtoolsLayout
    title="SEO Utils"
    icon="carbon:search-locate"
    version="7.0.19"
    github-url="https://github.com/harlan-zw/nuxt-seo-utils"
    :nav-items="navItems"
  >
    <template #actions>
      <UTooltip :text="connectionReady ? `Monitoring ${hostPath}` : 'Connecting...'" :delay-duration="300">
        <div
          class="w-2 h-2 rounded-full transition-colors"
          :class="connectionReady ? 'bg-green-500' : 'bg-amber-500 animate-pulse'"
        />
      </UTooltip>
    </template>
    <NuxtPage />
  </DevtoolsLayout>
</template>
